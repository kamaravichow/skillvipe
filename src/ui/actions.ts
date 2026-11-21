import { errorMessage } from '../scanners/common.js';
import type { Item } from '../core/types.js';
import type { Status } from './Footer.js';

/** Runs an operation on each item in turn and summarises the outcome as a status line. */
export async function runOnItems(items: Item[], verb: string, operation: (item: Item) => Promise<void>): Promise<Status> {
  const failures: string[] = [];
  for (const item of items) {
    try {
      await operation(item);
    } catch (error) {
      failures.push(`${item.name}: ${errorMessage(error)}`);
    }
  }
  const succeeded = items.length - failures.length;
  if (failures.length === 0) {
    const what = items.length === 1 ? items[0].name : `${items.length} items`;
    return { tone: 'success', text: `${verb} ${what}. Restart the affected agents to pick up the change.` };
  }
  return { tone: 'error', text: `${verb} ${succeeded}/${items.length}. ${failures.join(' | ')}` };
}
