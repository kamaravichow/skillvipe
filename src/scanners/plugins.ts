import path from 'node:path';
import { exists, isBrokenLink, isDirectory, listDir, moveToTrash } from '../core/fs.js';
import { editJson, getAt, readJson } from '../core/json-file.js';
import { addStash, configStashes, removeConfigStash } from '../core/state.js';
import type { ClaudePluginsSource, HarnessId, Item, JsonArraySource, PluginDirSource } from '../core/types.js';
import { sourceKey } from './common.js';
import { listPathEntries, makePathItem } from './path-items.js';

interface ClaudeInstall {
  installPath?: string;
  version?: string;
}

const SYNCED_MARKETPLACE = 'synced';

/** Plugins synced from claude.ai live in plugins/synced/<account>/<name>, outside installed_plugins.json. */
function syncedPluginPaths(installedFile: string, plugin: string): string[] {
  const syncedDir = path.join(path.dirname(installedFile), SYNCED_MARKETPLACE);
  return listDir(syncedDir)
    .filter((account) => account.isDirectory())
    .map((account) => path.join(syncedDir, account.name, plugin))
    .filter(exists);
}

/** Claude Code plugins: `enabledPlugins` in settings.json plus installed_plugins.json. */
export function scanClaudePlugins(source: ClaudePluginsSource, usedBy: HarnessId[]): Item[] {
  const key = sourceKey(source);
  const enabledMap = (getAt(readJson(source.settingsFile), ['enabledPlugins']) ?? {}) as Record<string, unknown>;
  const installed = (getAt(readJson(source.installedFile), ['plugins']) ?? {}) as Record<string, ClaudeInstall[]>;
  const names = new Set([...Object.keys(enabledMap), ...Object.keys(installed)]);

  return [...names].map((name) => {
    const [plugin, marketplace] = name.split('@');
    const synced = marketplace === SYNCED_MARKETPLACE;
    const installs = Array.isArray(installed[name]) ? installed[name] : [];
    const installPaths = synced
      ? syncedPluginPaths(source.installedFile, plugin)
      : installs.map((i) => i.installPath).filter((p): p is string => typeof p === 'string');
    const enabled = enabledMap[name] === true;
    const issues: string[] = [];
    if (installPaths.length === 0 && installs.length === 0) issues.push('listed in settings but not installed');
    else if (!installPaths.some(exists)) issues.push('plugin files missing on disk');
    const detail = synced ? 'synced from claude.ai' : installs[0]?.version ? `v${installs[0].version}` : '';

    return {
      id: `${key}#${name}`,
      kind: 'plugin',
      name,
      scope: source.scope,
      enabled,
      usedBy,
      location: source.settingsFile,
      detail,
      issues,
      ops: {
        setEnabled: (next) => editJson(source.settingsFile, ['enabledPlugins', name], next),
        async remove() {
          if (name in enabledMap) await editJson(source.settingsFile, ['enabledPlugins', name], undefined);
          if (name in installed) await editJson(source.installedFile, ['plugins', name], undefined);
          // Synced plugins are owned by claude.ai and would come back, so their files are left alone.
          if (!synced) for (const p of installPaths) await moveToTrash(p);
        },
      },
    };
  });
}

/** Name of a plugin/package array element: a plain string or an object with a source field. */
function entryName(entry: unknown): string {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') {
    const obj = entry as Record<string, unknown>;
    for (const field of ['package', 'source', 'name', 'path']) {
      if (typeof obj[field] === 'string') return obj[field] as string;
    }
  }
  return JSON.stringify(entry);
}

function readArray(source: JsonArraySource): { key: string; values: unknown[] } {
  const json = readJson(source.file);
  for (const key of source.keys) {
    const value = getAt(json, [key]);
    if (Array.isArray(value)) return { key, values: value };
  }
  return { key: source.keys[0], values: [] };
}

/**
 * Plugins listed in a JSON array (OpenCode `plugin`/`plugins`, Pi `packages`).
 * Disabling moves the element into the skillvipe stash; enabling appends it back.
 */
export function scanJsonArray(source: JsonArraySource, usedBy: HarnessId[]): Item[] {
  const key = sourceKey(source);
  const { values } = readArray(source);

  const withoutEntry = (name: string) => {
    const current = readArray(source);
    return { key: current.key, values: current.values.filter((v) => entryName(v) !== name) };
  };

  const makeItem = (value: unknown, stashed: boolean): Item => {
    const name = entryName(value);
    // OpenCode supports "-id" entries as an explicit native disable.
    const nativelyDisabled = typeof value === 'string' && value.startsWith('-');
    return {
      id: `${key}#${name}`,
      kind: 'plugin',
      name,
      scope: source.scope,
      enabled: !stashed && !nativelyDisabled,
      usedBy,
      location: source.file,
      detail: typeof value === 'object' ? 'configured with options' : '',
      issues: [],
      ops: {
        async setEnabled(next) {
          if (next) {
            if (!stashed) return;
            const current = readArray(source);
            await editJson(source.file, [current.key], [...current.values, value]);
            await removeConfigStash(key, name);
          } else {
            if (stashed) return;
            await addStash({ type: 'config', sourceKey: key, name, value });
            const updated = withoutEntry(name);
            await editJson(source.file, [updated.key], updated.values);
          }
        },
        async remove() {
          if (stashed) {
            await removeConfigStash(key, name);
            return;
          }
          const updated = withoutEntry(name);
          await editJson(source.file, [updated.key], updated.values);
        },
      },
    };
  };

  return [...values.map((v) => makeItem(v, false)), ...configStashes(key).map((s) => makeItem(s.value, true))];
}

const SCRIPT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts']);

/** Plugin or extension folders/files dropped into a harness folder. */
export function scanPluginDir(source: PluginDirSource, usedBy: HarnessId[]): Item[] {
  const key = sourceKey(source);
  const accept = (name: string, full: string) => {
    const dir = isDirectory(full);
    if (source.accept === 'dirs') return dir;
    const script = !dir && SCRIPT_EXTENSIONS.has(path.extname(name));
    return source.accept === 'scripts' ? script : dir || script;
  };
  return listPathEntries(source.dir, accept).map((entry) =>
    makePathItem({
      entry,
      idPrefix: key,
      kind: 'plugin',
      scope: source.scope,
      usedBy,
      detail: isDirectory(entry.currentPath) ? 'folder' : path.extname(entry.name).slice(1) + ' file',
      issues: isBrokenLink(entry.currentPath) ? ['broken symlink'] : [],
    }),
  );
}
