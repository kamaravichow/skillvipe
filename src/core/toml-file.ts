import { parse } from 'smol-toml';
import { backupFile, readText, writeTextAtomic } from './fs.js';

/**
 * Minimal line-based TOML editing. Reading goes through a real parser, but writes touch
 * only the lines that change so comments and layout in files like ~/.codex/config.toml survive.
 */

export function readToml(file: string): Record<string, unknown> | undefined {
  const text = readText(file);
  if (text === undefined) return undefined;
  try {
    return parse(text) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/** Parses `[a.b."c.d"]` or `[[a.b]]` into its key parts, or returns null for non-header lines. */
export function parseTableHeader(line: string): string[] | null {
  const match = line.trim().match(/^\[\[?(.+?)\]\]?\s*(#.*)?$/);
  if (!match) return null;
  const keys: string[] = [];
  const body = match[1];
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === ' ' || ch === '\t' || ch === '.') {
      i++;
    } else if (ch === '"' || ch === "'") {
      const end = body.indexOf(ch, i + 1);
      if (end === -1) return null;
      keys.push(body.slice(i + 1, end));
      i = end + 1;
    } else {
      let end = i;
      while (end < body.length && !/[.\s]/.test(body[end])) end++;
      keys.push(body.slice(i, end));
      i = end;
    }
  }
  return keys;
}

function startsWith(keys: string[], prefix: string[]): boolean {
  return prefix.length <= keys.length && prefix.every((k, idx) => keys[idx] === k);
}

function sameKeys(a: string[], b: string[]): boolean {
  return a.length === b.length && startsWith(a, b);
}

/** Line range [start, end) of the table with exactly these keys, header included. */
function findTable(lines: string[], keys: string[]): { start: number; end: number } | null {
  const start = lines.findIndex((line) => {
    const header = parseTableHeader(line);
    return header !== null && sameKeys(header, keys);
  });
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length && parseTableHeader(lines[end]) === null) end++;
  return { start, end };
}

async function writeLines(file: string, lines: string[]): Promise<void> {
  await backupFile(file);
  await writeTextAtomic(file, lines.join('\n'));
}

function readLines(file: string): string[] {
  const text = readText(file);
  if (text === undefined) throw new Error(`File not found: ${file}`);
  return text.split('\n');
}

/** Sets `key = literal` inside the table, adding the line right below the header if missing. */
export async function setTomlKey(file: string, tableKeys: string[], key: string, literal: string): Promise<void> {
  const lines = readLines(file);
  const range = findTable(lines, tableKeys);
  if (!range) throw new Error(`Table [${tableKeys.join('.')}] not found in ${file}. Edit it manually.`);
  const keyPattern = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=`);
  const existing = lines.slice(range.start + 1, range.end).findIndex((line) => keyPattern.test(line));
  if (existing === -1) lines.splice(range.start + 1, 0, `${key} = ${literal}`);
  else lines[range.start + 1 + existing] = `${key} = ${literal}`;
  await writeLines(file, lines);
}

/** Removes a table and all of its sub-tables, e.g. [mcp_servers.x] plus [mcp_servers.x.env]. */
export async function removeTomlTable(file: string, tableKeys: string[]): Promise<void> {
  const lines = readLines(file);
  const kept: string[] = [];
  let skipping = false;
  for (const line of lines) {
    const header = parseTableHeader(line);
    if (header !== null) skipping = startsWith(header, tableKeys);
    if (!skipping) kept.push(line);
  }
  if (kept.length === lines.length) throw new Error(`Table [${tableKeys.join('.')}] not found in ${file}. Edit it manually.`);
  await writeLines(file, kept);
}
