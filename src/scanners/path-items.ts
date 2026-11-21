import path from 'node:path';
import { isBrokenLink, listDir, movePath, moveToTrash } from '../core/fs.js';
import { addStash, pathStashesIn, removePathStash, stashDirFor } from '../core/state.js';
import type { HarnessId, Item, ItemKind, Scope } from '../core/types.js';

/**
 * Items that are files or folders inside a harness folder (skills, extension files, plugin
 * folders). Disabling moves them to ~/.skillvipe/disabled; enabling moves them back.
 */
export interface PathEntry {
  name: string;
  /** Where the entry lives while enabled. */
  originalPath: string;
  /** Where the entry currently is on disk. */
  currentPath: string;
  enabled: boolean;
}

export function listPathEntries(dir: string, accept: (name: string, fullPath: string) => boolean): PathEntry[] {
  const live = listDir(dir)
    .filter((entry) => !entry.name.startsWith('.') && entry.name !== 'node_modules')
    .map((entry) => path.join(dir, entry.name))
    .filter((full) => isBrokenLink(full) || accept(path.basename(full), full))
    .map((full) => ({ name: path.basename(full), originalPath: full, currentPath: full, enabled: true }));

  const stashed = pathStashesIn(dir).map((stash) => ({
    name: path.basename(stash.originalPath),
    originalPath: stash.originalPath,
    currentPath: stash.stashedPath,
    enabled: false,
  }));

  return [...live, ...stashed];
}

interface PathItemInput {
  entry: PathEntry;
  idPrefix: string;
  kind: ItemKind;
  scope: Scope;
  usedBy: HarnessId[];
  detail: string;
  issues: string[];
}

export function makePathItem({ entry, idPrefix, kind, scope, usedBy, detail, issues }: PathItemInput): Item {
  return {
    id: `${idPrefix}#${entry.name}`,
    kind,
    name: entry.name,
    scope,
    enabled: entry.enabled,
    usedBy,
    location: entry.originalPath,
    detail,
    issues,
    ops: {
      async setEnabled(enabled) {
        if (enabled === entry.enabled) return;
        if (enabled) {
          await movePath(entry.currentPath, entry.originalPath);
          await removePathStash(entry.originalPath);
        } else {
          const stashedPath = path.join(stashDirFor(path.dirname(entry.originalPath)), entry.name);
          await movePath(entry.originalPath, stashedPath);
          await addStash({ type: 'path', originalPath: entry.originalPath, stashedPath });
        }
      },
      async remove() {
        await moveToTrash(entry.currentPath);
        if (!entry.enabled) await removePathStash(entry.originalPath);
      },
    },
  };
}
