import fs from 'node:fs';
import path from 'node:path';
import { realPathOr } from '../core/fs.js';
import type { Source } from '../core/types.js';

/** Identity of a source. Two harnesses declaring the same folder or file entry share one key. */
export function sourceKey(source: Source): string {
  switch (source.type) {
    case 'skills-dir':
    case 'plugin-dir':
      return `${source.type}:${realPathOr(source.dir)}`;
    case 'json-mcp':
      return `${source.type}:${realPathOr(source.file)}:${JSON.stringify(source.mapPath)}`;
    case 'json-array':
      return `${source.type}:${realPathOr(source.file)}:${JSON.stringify(source.keys)}`;
    case 'toml-mcp':
    case 'toml-plugins':
      return `${source.type}:${realPathOr(source.file)}`;
    case 'claude-plugins':
      return `${source.type}:${realPathOr(source.settingsFile)}`;
  }
}

const commandCache = new Map<string, boolean>();

/** Checks whether a stdio MCP command can be launched: an existing path or a binary on PATH. */
export function commandExists(command: string): boolean {
  if (command.includes('/')) return fs.existsSync(command.replace(/^~/, process.env.HOME ?? ''));
  const cached = commandCache.get(command);
  if (cached !== undefined) return cached;
  const extensions = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : [''];
  const found = (process.env.PATH ?? '')
    .split(path.delimiter)
    .some((dir) => extensions.some((ext) => fs.existsSync(path.join(dir, command + ext))));
  commandCache.set(command, found);
  return found;
}

type ServerConfig = Record<string, unknown>;

/** Extracts the executable from the different MCP config shapes (string or array command). */
export function mcpCommand(config: ServerConfig): string | undefined {
  const { command } = config;
  if (typeof command === 'string') return command;
  if (Array.isArray(command) && typeof command[0] === 'string') return command[0];
  return undefined;
}

export function mcpUrl(config: ServerConfig): string | undefined {
  for (const key of ['url', 'serverUrl', 'httpUrl']) {
    if (typeof config[key] === 'string') return config[key] as string;
  }
  return undefined;
}

const SECRET_NAME = /key|token|secret|password|passwd|auth|credential|bearer/i;

/** Hides values that look like credentials: secret query params and secret-looking CLI flags. */
export function maskSecrets(text: string): string {
  return text
    .replace(/([?&])([^=&\s]+)=([^&\s]+)/g, (match, sep: string, name: string) =>
      SECRET_NAME.test(name) ? `${sep}${name}=•••` : match,
    )
    .replace(/(--?[\w-]*(?:key|token|secret|password)[\w-]*[= ])(\S+)/gi, '$1•••');
}

export function describeMcp(config: ServerConfig): string {
  const url = mcpUrl(config);
  if (url) return maskSecrets(url);
  const parts = Array.isArray(config.command) ? config.command : [config.command, ...(Array.isArray(config.args) ? config.args : [])];
  return maskSecrets(parts.filter((p) => typeof p === 'string').join(' '));
}

export function mcpIssues(config: ServerConfig): string[] {
  const command = mcpCommand(config);
  if (command && !commandExists(command)) return [`command not found: ${command}`];
  if (!command && !mcpUrl(config)) return ['no command or url configured'];
  return [];
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
