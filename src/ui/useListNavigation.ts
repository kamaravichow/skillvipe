import { useState } from 'react';
import type { Key } from 'ink';

/** Cursor state plus the shared ↑/↓/PgUp/PgDn/g/G handling used by every list view. */
export function useListNavigation(length: number, pageSize: number) {
  const [rawCursor, setCursor] = useState(0);
  const cursor = Math.min(rawCursor, Math.max(length - 1, 0));

  /** Returns true when the key was a navigation key and has been handled. */
  function handleNavigation(input: string, key: Key): boolean {
    const move = (to: number) => setCursor(Math.max(0, Math.min(to, length - 1)));
    if (key.upArrow || input === 'k') move(cursor - 1);
    else if (key.downArrow || input === 'j') move(cursor + 1);
    else if (key.pageUp) move(cursor - pageSize);
    else if (key.pageDown) move(cursor + pageSize);
    else if (input === 'g' || key.home) move(0);
    else if (input === 'G' || key.end) move(length - 1);
    else return false;
    return true;
  }

  return { cursor, setCursor, handleNavigation };
}
