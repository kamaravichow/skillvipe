import { allHarnesses, HARNESS_NAMES, isInstalled } from '../harnesses/index.js';
import { tildify } from './paths.js';
import { scanSource, sourceKey } from '../scanners/index.js';
import { errorMessage } from '../scanners/common.js';
import type { Harness, HarnessId, Item, Source } from './types.js';

export interface HarnessStatus {
  harness: Harness;
  installed: boolean;
}

export interface Inventory {
  harnesses: HarnessStatus[];
  items: Item[];
  /** Sources that failed to scan, e.g. a malformed config file. */
  errors: string[];
}

/** Groups sources by identity so shared folders/files are scanned once for all their harnesses. */
function mergeSources(harnesses: Harness[]): { source: Source; usedBy: HarnessId[] }[] {
  const merged = new Map<string, { source: Source; usedBy: HarnessId[] }>();
  for (const harness of harnesses) {
    for (const source of harness.sources) {
      const key = sourceKey(source);
      const existing = merged.get(key);
      if (!existing) merged.set(key, { source, usedBy: [harness.id] });
      else if (!existing.usedBy.includes(harness.id)) existing.usedBy.push(harness.id);
    }
  }
  return [...merged.values()];
}

/**
 * Flags a skill when an earlier skill with the same name is loaded by at least one of the same
 * agents. Only the repeats are flagged, so cleanup never removes every copy.
 */
function flagDuplicateSkills(items: Item[]): void {
  const seen = new Map<string, Item[]>();
  for (const item of items) {
    if (item.kind !== 'skill' || !item.enabled) continue;
    const earlier = seen.get(item.name) ?? [];
    const clash = earlier.find((other) => other.usedBy.some((h) => item.usedBy.includes(h)));
    if (clash) {
      const agents = item.usedBy.filter((h) => clash.usedBy.includes(h)).map((h) => HARNESS_NAMES[h]);
      item.issues.push(`duplicate of ${tildify(clash.location)} (both loaded by ${agents.join(', ')})`);
    }
    seen.set(item.name, [...earlier, item]);
  }
}

export function scanInventory(cwd: string): Inventory {
  const harnesses = allHarnesses(cwd).map((harness) => ({ harness, installed: isInstalled(harness) }));
  const installed = harnesses.filter((h) => h.installed).map((h) => h.harness);
  const items: Item[] = [];
  const errors: string[] = [];

  for (const { source, usedBy } of mergeSources(installed)) {
    try {
      items.push(...scanSource(source, usedBy));
    } catch (error) {
      errors.push(`${sourceKey(source)}: ${errorMessage(error)}`);
    }
  }

  flagDuplicateSkills(items);
  return { harnesses, items, errors };
}
