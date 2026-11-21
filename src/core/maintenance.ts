import fsp from 'node:fs/promises';
import path from 'node:path';
import { dirSizeBytes, emptyTrash, trashDir } from './fs.js';
import { skillvipeHome } from './paths.js';
import type { Item } from './types.js';

export interface StorageUsage {
  trashBytes: number;
  backupBytes: number;
}

function backupsDir(): string {
  return path.join(skillvipeHome(), 'backups');
}

export function storageUsage(): StorageUsage {
  return { trashBytes: dirSizeBytes(trashDir()), backupBytes: dirSizeBytes(backupsDir()) };
}

export async function clearTrash(): Promise<void> {
  await emptyTrash();
}

export async function clearBackups(): Promise<void> {
  await fsp.rm(backupsDir(), { recursive: true, force: true });
}

/** Items that cleanup suggests removing: broken, missing, unlaunchable or duplicated. */
export function cleanupCandidates(items: Item[]): Item[] {
  return items.filter((item) => item.issues.length > 0);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}
