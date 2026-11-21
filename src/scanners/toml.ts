import path from 'node:path';
import { exists, moveToTrash } from '../core/fs.js';
import { readToml, removeTomlTable, setTomlKey } from '../core/toml-file.js';
import type { HarnessId, Item, TomlMcpSource, TomlPluginsSource } from '../core/types.js';
import { describeMcp, mcpIssues, sourceKey } from './common.js';

type Table = Record<string, Record<string, unknown>>;

function readTable(file: string, key: string): Table {
  const value = readToml(file)?.[key];
  return value && typeof value === 'object' ? (value as Table) : {};
}

/** Codex MCP servers: `[mcp_servers.<name>]` tables with a native `enabled` flag. */
export function scanTomlMcp(source: TomlMcpSource, usedBy: HarnessId[]): Item[] {
  const key = sourceKey(source);
  return Object.entries(readTable(source.file, 'mcp_servers')).map(([name, config]) => {
    const enabled = config.enabled !== false;
    const tableKeys = ['mcp_servers', name];
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
        setEnabled: (next) => setTomlKey(source.file, tableKeys, 'enabled', String(next)),
        remove: () => removeTomlTable(source.file, tableKeys),
      },
    };
  });
}

/** Codex plugins: `[plugins."<name>@<marketplace>"]` tables plus a cached copy on disk. */
export function scanTomlPlugins(source: TomlPluginsSource, usedBy: HarnessId[]): Item[] {
  const key = sourceKey(source);
  return Object.entries(readTable(source.file, 'plugins')).map(([name, config]) => {
    const enabled = config.enabled !== false;
    const tableKeys = ['plugins', name];
    const [plugin, marketplace] = name.split('@');
    const cachePath = marketplace ? path.join(source.cacheDir, marketplace, plugin) : undefined;
    const cached = cachePath !== undefined && exists(cachePath);
    return {
      id: `${key}#${name}`,
      kind: 'plugin',
      name,
      scope: source.scope,
      enabled,
      usedBy,
      location: source.file,
      detail: marketplace ? `marketplace: ${marketplace}` : '',
      // Bundled plugins may live outside the cache, so a missing cache folder is not reported.
      issues: [],
      ops: {
        setEnabled: (next) => setTomlKey(source.file, tableKeys, 'enabled', String(next)),
        async remove() {
          await removeTomlTable(source.file, tableKeys);
          if (cached) await moveToTrash(cachePath);
        },
      },
    };
  });
}
