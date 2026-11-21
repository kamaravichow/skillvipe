import path from 'node:path';
import crypto from 'node:crypto';
import { readText, writeTextAtomic } from './fs.js';
import { skillvipeHome } from './paths.js';

/** A config entry (MCP server, plugin array element) taken out of its file while disabled. */
export interface ConfigStash {
  type: 'config';
  sourceKey: string;
  name: string;
  value: unknown;
  disabledAt: string;
}

/** A skill folder or plugin file moved out of its harness folder while disabled. */
export interface PathStash {
  type: 'path';
  originalPath: string;
  stashedPath: string;
  disabledAt: string;
}

export type StashEntry = ConfigStash | PathStash;

interface StateFile {
  version: 1;
  stash: StashEntry[];
}

function stateFile(): string {
  return path.join(skillvipeHome(), 'state.json');
}

function load(): StateFile {
  const text = readText(stateFile());
  if (!text) return { version: 1, stash: [] };
  try {
    const parsed = JSON.parse(text) as StateFile;
    return { version: 1, stash: Array.isArray(parsed.stash) ? parsed.stash : [] };
  } catch {
    throw new Error(`skillvipe state file is corrupt: ${stateFile()}`);
  }
}

async function save(state: StateFile): Promise<void> {
  await writeTextAtomic(stateFile(), JSON.stringify(state, null, 2) + '\n');
}

export function configStashes(sourceKey: string): ConfigStash[] {
  return load().stash.filter((e): e is ConfigStash => e.type === 'config' && e.sourceKey === sourceKey);
}

export function pathStashesIn(dir: string): PathStash[] {
  return load().stash.filter((e): e is PathStash => e.type === 'path' && path.dirname(e.originalPath) === dir);
}

type NewStash = Omit<ConfigStash, 'disabledAt'> | Omit<PathStash, 'disabledAt'>;

export async function addStash(entry: NewStash): Promise<void> {
  const state = load();
  state.stash.push({ ...entry, disabledAt: new Date().toISOString() } as StashEntry);
  await save(state);
}

export async function removeConfigStash(sourceKey: string, name: string): Promise<void> {
  const state = load();
  state.stash = state.stash.filter((e) => !(e.type === 'config' && e.sourceKey === sourceKey && e.name === name));
  await save(state);
}

export async function removePathStash(originalPath: string): Promise<void> {
  const state = load();
  state.stash = state.stash.filter((e) => !(e.type === 'path' && e.originalPath === originalPath));
  await save(state);
}

/** Folder where a disabled item from `originalDir` is parked. Hashing keeps same-named folders apart. */
export function stashDirFor(originalDir: string): string {
  const hash = crypto.createHash('sha1').update(originalDir).digest('hex').slice(0, 12);
  return path.join(skillvipeHome(), 'disabled', `${path.basename(originalDir)}-${hash}`);
}
