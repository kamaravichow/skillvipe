import { editJson, getAt, readJson } from '../core/json-file.js';
import { addStash, configStashes, removeConfigStash } from '../core/state.js';
import type { HarnessId, Item, JsonMcpSource } from '../core/types.js';
import { describeMcp, mcpIssues, sourceKey } from './common.js';

type ServerMap = Record<string, Record<string, unknown>>;

function readServers(source: JsonMcpSource): ServerMap {
  const map = getAt(readJson(source.file), source.mapPath);
  return map && typeof map === 'object' && !Array.isArray(map) ? (map as ServerMap) : {};
}

function isEnabled(source: JsonMcpSource, config: Record<string, unknown>): boolean {
  if (source.disable.mode !== 'flag') return true;
  return config[source.disable.key] !== source.disable.disabledValue;
}

export function scanJsonMcp(source: JsonMcpSource, usedBy: HarnessId[]): Item[] {
  const key = sourceKey(source);
  const serverPath = (name: string) => [...source.mapPath, name];

  const makeItem = (name: string, config: Record<string, unknown>, stashed: boolean): Item => {
    const enabled = !stashed && isEnabled(source, config);
    return {
      id: `${key}#${name}`,
      kind: 'mcp',
      name,
      scope: source.scope,
      enabled,
      usedBy,
      location: source.file,
      detail: describeMcp(config),
      issues: enabled ? mcpIssues(config) : [],
      ops: {
        async setEnabled(next) {
          if (next === enabled) return;
          const { disable } = source;
          if (disable.mode === 'flag') {
            // Enabling drops the flag entirely, since every harness defaults to enabled.
            await editJson(source.file, [...serverPath(name), disable.key], next ? undefined : disable.disabledValue);
          } else if (next) {
            if (name in readServers(source)) throw new Error(`"${name}" already exists in ${source.file}`);
            await editJson(source.file, serverPath(name), config);
            await removeConfigStash(key, name);
          } else {
            // Save to the stash first so the entry is never lost if the file write fails.
            await addStash({ type: 'config', sourceKey: key, name, value: config });
            await editJson(source.file, serverPath(name), undefined);
          }
        },
        async remove() {
          if (stashed) await removeConfigStash(key, name);
          else await editJson(source.file, serverPath(name), undefined);
        },
      },
    };
  };

  const live = Object.entries(readServers(source)).map(([name, config]) => makeItem(name, config ?? {}, false));
  const stashed = configStashes(key).map((s) => makeItem(s.name, (s.value ?? {}) as Record<string, unknown>, true));
  return [...live, ...stashed];
}
