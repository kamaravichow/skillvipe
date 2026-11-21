import type { HarnessId, Item, Source } from '../core/types.js';
import { scanJsonMcp } from './json-mcp.js';
import { scanClaudePlugins, scanJsonArray, scanPluginDir } from './plugins.js';
import { scanSkillsDir } from './skills.js';
import { scanTomlMcp, scanTomlPlugins } from './toml.js';

export { sourceKey } from './common.js';

export function scanSource(source: Source, usedBy: HarnessId[]): Item[] {
  switch (source.type) {
    case 'skills-dir':
      return scanSkillsDir(source, usedBy);
    case 'json-mcp':
      return scanJsonMcp(source, usedBy);
    case 'toml-mcp':
      return scanTomlMcp(source, usedBy);
    case 'toml-plugins':
      return scanTomlPlugins(source, usedBy);
    case 'claude-plugins':
      return scanClaudePlugins(source, usedBy);
    case 'json-array':
      return scanJsonArray(source, usedBy);
    case 'plugin-dir':
      return scanPluginDir(source, usedBy);
  }
}
