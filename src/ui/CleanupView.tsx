import { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { cleanupCandidates, clearBackups, clearTrash, formatBytes, storageUsage } from '../core/maintenance.js';
import type { Item } from '../core/types.js';
import { runOnItems } from './actions.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { DetailPane } from './DetailPane.js';
import { KeyHints, type Status } from './Footer.js';
import { ItemList } from './ItemList.js';
import { colors } from './theme.js';
import { useListNavigation } from './useListNavigation.js';

type PendingAction = 'remove' | 'trash' | 'backups' | null;

interface CleanupViewProps {
  items: Item[];
  listHeight: number;
  onStatus(status: Status): void;
  onChanged(): void;
  onBack(): void;
}

export function CleanupView({ items, listHeight, onStatus, onChanged, onBack }: CleanupViewProps) {
  const candidates = useMemo(() => cleanupCandidates(items), [items]);
  const [checked, setChecked] = useState(() => new Set(candidates.map((i) => i.id)));
  const [pending, setPending] = useState<PendingAction>(null);
  const [usage, setUsage] = useState(storageUsage);
  const { cursor, handleNavigation } = useListNavigation(candidates.length, listHeight);
  const selected = candidates.filter((i) => checked.has(i.id));

  useInput(
    (input, key) => {
      if (handleNavigation(input, key)) return;
      if (key.escape || input === 'q') onBack();
      else if (input === ' ' && candidates[cursor]) {
        const id = candidates[cursor].id;
        setChecked((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      } else if (input === 'a') {
        setChecked(selected.length === candidates.length ? new Set() : new Set(candidates.map((i) => i.id)));
      } else if (key.return && selected.length > 0) setPending('remove');
      else if (input === 't' && usage.trashBytes > 0) setPending('trash');
      else if (input === 'b' && usage.backupBytes > 0) setPending('backups');
    },
    { isActive: pending === null },
  );

  async function confirm() {
    const action = pending;
    setPending(null);
    if (action === 'remove') {
      onStatus(await runOnItems(selected, 'Removed', (item) => item.ops.remove()));
      onChanged();
    } else if (action === 'trash') {
      await clearTrash();
      onStatus({ tone: 'success', text: 'Trash emptied.' });
    } else if (action === 'backups') {
      await clearBackups();
      onStatus({ tone: 'success', text: 'Backups deleted.' });
    }
    setUsage(storageUsage());
  }

  const dialog = {
    remove: { title: `Remove ${selected.length} flagged items?`, lines: selected.map((i) => i.name), note: 'Folders go to the skillvipe trash.' },
    trash: { title: `Empty trash (${formatBytes(usage.trashBytes)})?`, lines: ['Removed skills and plugins cannot be recovered afterwards.'] },
    backups: { title: `Delete config backups (${formatBytes(usage.backupBytes)})?`, lines: ['Earlier versions of your config files will be gone.'] },
  };

  return (
    <Box flexDirection="column">
      <Box paddingX={1} gap={2}>
        <Text bold color={colors.accent}>
          Cleanup
        </Text>
        <Text color={colors.muted}>
          {candidates.length} items with problems · trash {formatBytes(usage.trashBytes)} · backups {formatBytes(usage.backupBytes)}
        </Text>
      </Box>
      <ItemList
        items={candidates}
        cursor={cursor}
        marked={checked}
        height={listHeight}
        checkboxes
        emptyMessage="✨ Nothing to clean up: no broken, missing or duplicate items found."
      />
      {pending ? (
        <ConfirmDialog {...dialog[pending]} onConfirm={confirm} onCancel={() => setPending(null)} />
      ) : (
        <DetailPane item={candidates[cursor]} />
      )}
      <KeyHints
        hints={[
          ['space', 'check'],
          ['a', 'check all'],
          ['enter', `remove ${selected.length} checked`],
          ['t', 'empty trash'],
          ['b', 'delete backups'],
          ['esc', 'back'],
        ]}
      />
    </Box>
  );
}
