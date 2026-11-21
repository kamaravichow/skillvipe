export type HarnessId = 'claude' | 'codex' | 'opencode' | 'pi' | 'muse' | 'antigravity';

export type ItemKind = 'mcp' | 'skill' | 'plugin';

export type Scope = 'user' | 'project';

export interface ItemOps {
  setEnabled(enabled: boolean): Promise<void>;
  /** Removes the item. Folders go to the skillvipe trash, config files are backed up first. */
  remove(): Promise<void>;
}

export interface Item {
  /** Stable, unique identifier across the whole scan. */
  id: string;
  kind: ItemKind;
  name: string;
  scope: Scope;
  enabled: boolean;
  /** Harnesses that load this item. Shared skill folders are read by several. */
  usedBy: HarnessId[];
  /** Config file or folder that holds the item. */
  location: string;
  /** Short human-readable detail, e.g. the MCP command or skill description. */
  detail: string;
  /** Problems found while scanning, used by the cleanup view. */
  issues: string[];
  ops: ItemOps;
}

/**
 * A place where a harness keeps items. Harness definitions are declarative lists of sources;
 * scanners turn them into items. Sources with the same key are scanned once and their
 * harnesses are merged, which is how shared folders like ~/.agents/skills are handled.
 */
export type Source =
  | SkillsDirSource
  | JsonMcpSource
  | TomlMcpSource
  | TomlPluginsSource
  | ClaudePluginsSource
  | JsonArraySource
  | PluginDirSource;

interface SourceBase {
  scope: Scope;
}

export interface SkillsDirSource extends SourceBase {
  type: 'skills-dir';
  dir: string;
}

export type McpDisableMode =
  /** Harness supports a native flag, e.g. `"enabled": false` or `"disabled": true`. */
  | { mode: 'flag'; key: string; disabledValue: boolean }
  /** No native flag: the entry is moved into the skillvipe state file and restored on enable. */
  | { mode: 'stash' };

export interface JsonMcpSource extends SourceBase {
  type: 'json-mcp';
  file: string;
  /** JSON path to the object that maps server name -> server config. */
  mapPath: (string | number)[];
  disable: McpDisableMode;
}

export interface TomlMcpSource extends SourceBase {
  type: 'toml-mcp';
  file: string;
}

export interface TomlPluginsSource extends SourceBase {
  type: 'toml-plugins';
  file: string;
  cacheDir: string;
}

export interface ClaudePluginsSource extends SourceBase {
  type: 'claude-plugins';
  settingsFile: string;
  installedFile: string;
}

export interface JsonArraySource extends SourceBase {
  type: 'json-array';
  file: string;
  /** Candidate keys holding the array; the first present key wins. */
  keys: string[];
}

export interface PluginDirSource extends SourceBase {
  type: 'plugin-dir';
  dir: string;
  /** Which entries count as plugins: folders, script files, or both. */
  accept: 'dirs' | 'scripts' | 'both';
}

export interface Harness {
  id: HarnessId;
  name: string;
  /** Paths whose existence means the harness is installed. */
  markers: string[];
  sources: Source[];
}
