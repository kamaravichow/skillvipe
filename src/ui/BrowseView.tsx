import { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { HarnessStatus } from '../core/inventory.js';
import type { HarnessId, Item, ItemKind } from '../core/types.js';
import { runOnItems } from './actions.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { DetailPane } from './DetailPane.js';
import { KeyHints, type Status } from './Footer.js';
import { ItemList } from './ItemList.js';
import { Tabs, type Tab } from './Tabs.js';
import { colors } from './theme.js';
import { useListNavigation } from './useListNavigation.js';

type KindFilter = 'all' | ItemKind;
const KIND_FILTERS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mcp', label: 'MCP' },
  { key: 'skill', label: 'Skills' },
  { key: 'plugin', label: 'Plugins' },
];
const KIND_ORDER: Record<ItemKind, number> = { mcp: 0, skill: 1, plugin: 2 };

interface BrowseViewProps {
  harnesses: HarnessStatus[];
  items: Item[];
  listHeight: number;
  busy: boolean;
  onStatus(status: Status): void;
  onRun(task: () => Promise<Status>): void;
  onOpenCleanup(): void;
  onOpenHelp(): void;
  onRescan(): void;
  onQuit(): void;
}

function matchesQuery(item: Item, query: string): boolean {
  const q = query.toLowerCase();
  return item.name.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q);
}

export function BrowseView(props: BrowseViewProps) {
  const { harnesses, items, listHeight, busy } = props;
  const [tabIndex, setTabIndex] = useState(0);
  const [kindIndex, setKindIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [confirmRemove, setConfirmRemove] = useState<Item[] | null>(null);

  const tabs: (Tab & { harness?: HarnessId })[] = useMemo(
    () => [
      { key: 'all', label: 'All agents', count: items.length },
      ...harnesses.map(({ harness, installed }) => ({
        key: harness.id,
        harness: harness.id,
        label: harness.name,
        count: installed ? items.filter((i) => i.usedBy.includes(harness.id)).length : undefined,
        dimmed: !installed,
      })),
    ],
    [harnesses, items],
  );
  const activeTab = tabs[tabIndex];
  const kind = KIND_FILTERS[kindIndex].key;

  const visible = useMemo(
    () =>
      items
        .filter((i) => !activeTab.harness || i.usedBy.includes(activeTab.harness))
        .filter((i) => kind === 'all' || i.kind === kind)
        .filter((i) => !query || matchesQuery(i, query))
        .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name)),
    [items, activeTab, kind, query],
  );

  const { cursor, setCursor, handleNavigation } = useListNavigation(visible.length, listHeight);
  const current = visible[cursor];
  const markedVisible = visible.filter((i) => marked.has(i.id));
  /** Bulk actions apply to marked items when there are any, otherwise to the item under the cursor. */
  const targets = markedVisible.length > 0 ? markedVisible : current ? [current] : [];

  const switchTab = (delta: number) => {
    setTabIndex((tabIndex + delta + tabs.length) % tabs.length);
    setCursor(0);
  };

  const toggleMark = (id: string) =>
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleTargets = () => {
    const batch = targets;
    // Mixed selections are all enabled first; a uniform selection flips.
    const enable = batch.some((i) => !i.enabled);
    props.onRun(() => runOnItems(batch, enable ? 'Enabled' : 'Disabled', (item) => item.ops.setEnabled(enable)));
  };

  const removeTargets = () => {
    const batch = confirmRemove ?? [];
    setConfirmRemove(null);
    setMarked(new Set());
    props.onRun(() => runOnItems(batch, 'Removed', (item) => item.ops.remove()));
  };

  useInput(
    (input, key) => {
      if (searching) {
        if (key.return || key.escape) {
          setSearching(false);
          if (key.escape) setQuery('');
        } else if (key.backspace || key.delete) setQuery((q) => q.slice(0, -1));
        else if (input && !key.ctrl && !key.meta) setQuery((q) => q + input);
        setCursor(0);
        return;
      }
      if (handleNavigation(input, key)) return;
      if (key.leftArrow || input === 'h') switchTab(-1);
      else if (key.rightArrow || input === 'l') switchTab(1);
      else if (key.tab) setKindIndex((kindIndex + (key.shift ? 3 : 1)) % 4);
      else if (['1', '2', '3', '4'].includes(input)) setKindIndex(Number(input) - 1);
      else if (input === '/') setSearching(true);
      else if (input === 'q' || (key.escape && !query && marked.size === 0)) props.onQuit();
      else if (key.escape) {
        setQuery('');
        setMarked(new Set());
      } else if (busy) return;
      else if (input === ' ' && targets.length) toggleTargets();
      else if (input === 'm' && current) {
        toggleMark(current.id);
        setCursor(Math.min(cursor + 1, visible.length - 1));
      } else if (input === 'a') setMarked(markedVisible.length === visible.length ? new Set() : new Set(visible.map((i) => i.id)));
      else if ((input === 'd' || key.delete) && targets.length) setConfirmRemove(targets);
      else if (input === 'c') props.onOpenCleanup();
      else if (input === 'r') props.onRescan();
      else if (input === '?') props.onOpenHelp();
    },
    { isActive: confirmRemove === null },
  );

  const shared = confirmRemove?.some((i) => i.usedBy.length > 1);

  return (
    <Box flexDirection="column">
      <Tabs tabs={tabs} activeKey={activeTab.key} />
      <Box paddingX={1} justifyContent="space-between">
        <Tabs tabs={KIND_FILTERS} activeKey={kind} hint="show" />
        <Box gap={2} paddingRight={1}>
          {(searching || query) && (
            <Text>
              <Text color={colors.accent}>/</Text>
              <Text color={colors.text}>{query}</Text>
              {searching && <Text color={colors.accent}>▏</Text>}
            </Text>
          )}
          {marked.size > 0 && <Text color={colors.accent}>{marked.size} marked</Text>}
          <Text color={colors.muted}>{visible.length ? `${cursor + 1}/${visible.length}` : '0/0'}</Text>
        </Box>
      </Box>
      <ItemList
        items={visible}
        cursor={cursor}
        marked={marked}
        height={listHeight}
        emptyMessage={activeTab.dimmed ? `${activeTab.label} is not installed on this machine.` : 'Nothing here.'}
      />
      {confirmRemove ? (
        <ConfirmDialog
          title={`Remove ${confirmRemove.length === 1 ? confirmRemove[0].name : `${confirmRemove.length} items`}?`}
          lines={confirmRemove.map((i) => i.name)}
          note={
            shared
              ? 'Some of these live in a shared folder and will disappear from every agent that uses it.'
              : 'Config files are backed up and folders go to the skillvipe trash.'
          }
          onConfirm={removeTargets}
          onCancel={() => setConfirmRemove(null)}
        />
      ) : (
        <DetailPane item={current} />
      )}
      <KeyHints
        hints={[
          ['←→', 'agent'],
          ['tab', 'type'],
          ['space', current?.enabled === false && markedVisible.length === 0 ? 'enable' : 'toggle'],
          ['m', 'mark'],
          ['d', 'remove'],
          ['/', 'search'],
          ['c', 'cleanup'],
          ['?', 'help'],
          ['q', 'quit'],
        ]}
      />
    </Box>
  );
}
