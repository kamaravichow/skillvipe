import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { skillvipeHome } from './paths.js';

export function exists(p: string): boolean {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

export function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** True for a symlink whose target no longer exists. */
export function isBrokenLink(p: string): boolean {
  try {
    if (!fs.lstatSync(p).isSymbolicLink()) return false;
    fs.statSync(p);
    return false;
  } catch {
    return true;
  }
}

export function readText(p: string): string | undefined {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return undefined;
  }
}

export function listDir(dir: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

export function realPathOr(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/** Copies a config file into ~/.skillvipe/backups before it is modified. */
export async function backupFile(file: string): Promise<void> {
  if (!exists(file)) return;
  const flatName = file.replace(/[\\/:]/g, '_');
  const target = path.join(skillvipeHome(), 'backups', `${timestamp()}${flatName}`);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.copyFile(file, target);
}

/** Writes a file atomically so a crash never leaves a half-written config behind. */
export async function writeTextAtomic(file: string, content: string): Promise<void> {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.skillvipe-${process.pid}.tmp`;
  await fsp.writeFile(tmp, content, 'utf8');
  await fsp.rename(tmp, file);
}

/** Moves a file, folder or symlink, falling back to copy + delete across devices. */
export async function movePath(from: string, to: string): Promise<void> {
  if (exists(to)) throw new Error(`Destination already exists: ${to}`);
  await fsp.mkdir(path.dirname(to), { recursive: true });
  try {
    await fsp.rename(from, to);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error;
    await fsp.cp(from, to, { recursive: true, verbatimSymlinks: true });
    await fsp.rm(from, { recursive: true, force: true });
  }
}

export function trashDir(): string {
  return path.join(skillvipeHome(), 'trash');
}

/** Moves a path into ~/.skillvipe/trash instead of deleting it outright. */
export async function moveToTrash(p: string): Promise<void> {
  if (!exists(p)) return;
  await movePath(p, path.join(trashDir(), timestamp(), path.basename(p)));
}

export async function emptyTrash(): Promise<void> {
  await fsp.rm(trashDir(), { recursive: true, force: true });
}

export function dirSizeBytes(dir: string): number {
  let total = 0;
  for (const entry of listDir(dir)) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSizeBytes(full);
    else {
      try {
        total += fs.lstatSync(full).size;
      } catch {
        // Ignore entries that vanish while we count.
      }
    }
  }
  return total;
}
