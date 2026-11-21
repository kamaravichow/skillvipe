import path from 'node:path';
import { exists } from '../core/fs.js';
import { fromHome, xdgConfigHome } from '../core/paths.js';
import type { Harness, HarnessId, Source } from '../core/types.js';

/**
 * Where each coding harness keeps its MCP servers, skills and plugins.
 * Sources are scanned at user level (home directory) and project level (current directory).
 */

const STASH = { mode: 'stash' } as const;
const agentsSkills = fromHome('.agents', 'skills');
const claudeSkills = fromHome('.claude', 'skills');

function codexHome(): string {
  return process.env.CODEX_HOME || fromHome('.codex');
}

function firstExisting(candidates: string[]): string {
  return candidates.find(exists) ?? candidates[0];
}

function claude(cwd: string): Harness {
  const configDir = process.env.CLAUDE_CONFIG_DIR || fromHome('.claude');
  // ~/.claude.json by default, or <CLAUDE_CONFIG_DIR>/.claude.json when that variable is in use.
  const stateFiles = [...new Set([path.join(configDir, '.claude.json'), fromHome('.claude.json')])].filter(exists);
  const sources: Source[] = stateFiles.flatMap((file): Source[] => [
    { type: 'json-mcp', scope: 'user', file, mapPath: ['mcpServers'], disable: STASH },
    { type: 'json-mcp', scope: 'project', file, mapPath: ['projects', cwd, 'mcpServers'], disable: STASH },
  ]);
  sources.push(
    { type: 'json-mcp', scope: 'project', file: path.join(cwd, '.mcp.json'), mapPath: ['mcpServers'], disable: STASH },
    { type: 'skills-dir', scope: 'user', dir: path.join(configDir, 'skills') },
    { type: 'skills-dir', scope: 'project', dir: path.join(cwd, '.claude', 'skills') },
    {
      type: 'claude-plugins',
      scope: 'user',
      settingsFile: path.join(configDir, 'settings.json'),
      installedFile: path.join(configDir, 'plugins', 'installed_plugins.json'),
    },
  );
  return { id: 'claude', name: 'Claude Code', markers: [configDir, fromHome('.claude.json')], sources };
}

function codex(cwd: string): Harness {
  const dir = codexHome();
  return {
    id: 'codex',
    name: 'Codex',
    markers: [dir],
    sources: [
      { type: 'toml-mcp', scope: 'user', file: path.join(dir, 'config.toml') },
      { type: 'toml-plugins', scope: 'user', file: path.join(dir, 'config.toml'), cacheDir: path.join(dir, 'plugins', 'cache') },
      { type: 'skills-dir', scope: 'user', dir: path.join(dir, 'skills') },
      { type: 'skills-dir', scope: 'user', dir: agentsSkills },
      { type: 'toml-mcp', scope: 'project', file: path.join(cwd, '.codex', 'config.toml') },
      { type: 'skills-dir', scope: 'project', dir: path.join(cwd, '.agents', 'skills') },
    ],
  };
}

function opencodeConfigSources(file: string, scope: 'user' | 'project'): Source[] {
  return [
    { type: 'json-mcp', scope, file, mapPath: ['mcp'], disable: { mode: 'flag', key: 'enabled', disabledValue: false } },
    { type: 'json-array', scope, file, keys: ['plugin', 'plugins'] },
  ];
}

function opencode(cwd: string): Harness {
  const dir = path.join(xdgConfigHome(), 'opencode');
  const configIn = (base: string) => firstExisting([path.join(base, 'opencode.jsonc'), path.join(base, 'opencode.json')]);
  return {
    id: 'opencode',
    name: 'OpenCode',
    markers: [dir, fromHome('.opencode')],
    sources: [
      ...opencodeConfigSources(configIn(dir), 'user'),
      { type: 'plugin-dir', scope: 'user', dir: path.join(dir, 'plugins'), accept: 'both' },
      { type: 'plugin-dir', scope: 'user', dir: path.join(dir, 'plugin'), accept: 'both' },
      { type: 'skills-dir', scope: 'user', dir: path.join(dir, 'skills') },
      { type: 'skills-dir', scope: 'user', dir: claudeSkills },
      { type: 'skills-dir', scope: 'user', dir: agentsSkills },
      ...opencodeConfigSources(configIn(cwd), 'project'),
      ...opencodeConfigSources(configIn(path.join(cwd, '.opencode')), 'project'),
      { type: 'plugin-dir', scope: 'project', dir: path.join(cwd, '.opencode', 'plugins'), accept: 'both' },
      { type: 'skills-dir', scope: 'project', dir: path.join(cwd, '.opencode', 'skills') },
      { type: 'skills-dir', scope: 'project', dir: path.join(cwd, '.claude', 'skills') },
      { type: 'skills-dir', scope: 'project', dir: path.join(cwd, '.agents', 'skills') },
    ],
  };
}

function pi(cwd: string): Harness {
  const dir = process.env.PI_CODING_AGENT_DIR || fromHome('.pi', 'agent');
  const piSources = (base: string, scope: 'user' | 'project'): Source[] => [
    { type: 'json-mcp', scope, file: path.join(base, 'mcp.json'), mapPath: ['mcpServers'], disable: STASH },
    { type: 'json-array', scope, file: path.join(base, 'settings.json'), keys: ['packages'] },
    { type: 'plugin-dir', scope, dir: path.join(base, 'extensions'), accept: 'both' },
    { type: 'skills-dir', scope, dir: path.join(base, 'skills') },
  ];
  return {
    id: 'pi',
    name: 'Pi',
    markers: [dir],
    sources: [...piSources(dir, 'user'), ...piSources(path.join(cwd, '.pi'), 'project')],
  };
}

function muse(cwd: string): Harness {
  const dir = path.join(xdgConfigHome(), 'muse');
  const settings = path.join(dir, 'settings.json');
  const flag = { mode: 'flag', key: 'enabled', disabledValue: false } as const;
  return {
    id: 'muse',
    name: 'Muse Code',
    markers: [dir],
    sources: [
      // Muse accepts both the documented `mcpServers` and the legacy `mcp_servers` spelling.
      { type: 'json-mcp', scope: 'user', file: settings, mapPath: ['mcpServers'], disable: flag },
      { type: 'json-mcp', scope: 'user', file: settings, mapPath: ['mcp_servers'], disable: flag },
      { type: 'skills-dir', scope: 'user', dir: path.join(dir, 'skills') },
      { type: 'skills-dir', scope: 'user', dir: agentsSkills },
      { type: 'skills-dir', scope: 'user', dir: claudeSkills },
      { type: 'skills-dir', scope: 'user', dir: path.join(codexHome(), 'skills') },
      // .mcp.json is shared with Claude Code, which has no native flag, so it is stashed.
      { type: 'json-mcp', scope: 'project', file: path.join(cwd, '.mcp.json'), mapPath: ['mcpServers'], disable: STASH },
      { type: 'skills-dir', scope: 'project', dir: path.join(cwd, '.agents', 'skills') },
    ],
  };
}

function antigravity(cwd: string): Harness {
  const config = fromHome('.gemini', 'config');
  const flag = { mode: 'flag', key: 'disabled', disabledValue: true } as const;
  return {
    id: 'antigravity',
    name: 'Antigravity CLI',
    markers: [fromHome('.gemini', 'antigravity-cli'), config],
    sources: [
      { type: 'json-mcp', scope: 'user', file: path.join(config, 'mcp_config.json'), mapPath: ['mcpServers'], disable: flag },
      { type: 'skills-dir', scope: 'user', dir: path.join(config, 'skills') },
      { type: 'skills-dir', scope: 'user', dir: fromHome('.gemini', 'skills') },
      { type: 'skills-dir', scope: 'user', dir: fromHome('.gemini', 'antigravity-cli', 'skills') },
      { type: 'plugin-dir', scope: 'user', dir: path.join(config, 'plugins'), accept: 'dirs' },
      { type: 'json-mcp', scope: 'project', file: path.join(cwd, '.agents', 'mcp_config.json'), mapPath: ['mcpServers'], disable: flag },
      { type: 'skills-dir', scope: 'project', dir: path.join(cwd, '.agents', 'skills') },
      { type: 'plugin-dir', scope: 'project', dir: path.join(cwd, '.agents', 'plugins'), accept: 'dirs' },
    ],
  };
}

export function allHarnesses(cwd: string): Harness[] {
  return [claude(cwd), codex(cwd), opencode(cwd), pi(cwd), muse(cwd), antigravity(cwd)];
}

export function isInstalled(harness: Harness): boolean {
  return harness.markers.some(exists);
}

export const HARNESS_NAMES: Record<HarnessId, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  opencode: 'OpenCode',
  pi: 'Pi',
  muse: 'Muse Code',
  antigravity: 'Antigravity CLI',
};
