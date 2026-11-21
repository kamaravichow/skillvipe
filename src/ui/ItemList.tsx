import { Box, Text } from 'ink';
import type { Item } from '../core/types.js';
import { colors, harnessStyle, kindStyle, symbols } from './theme.js';

interface ItemListProps {
  items: Item[];
  cursor: number;
  marked: Set<string>;
  height: number;
  emptyMessage: string;
  /** Show a checkbox column instead of the mark column (cleanup view). */
  checkboxes?: boolean;
}

/** Keeps the cursor visible by sliding a window of `height` rows over the list. */
function visibleWindow(total: number, cursor: number, height: number): [number, number] {
  if (total <= height) return [0, total];
  const start = Math.min(Math.max(cursor - Math.floor(height / 2), 0), total - height);
  return [start, start + height];
}

function Row({ item, active, marked, checkbox }: { item: Item; active: boolean; marked: boolean; checkbox: boolean }) {
  const kind = kindStyle[item.kind];
  const hasIssue = item.issues.length > 0;
  const mark = checkbox ? (marked ? '[x]' : '[ ]') : marked ? symbols.marked : ' ';
  return (
    <Box backgroundColor={active ? colors.selection : undefined}>
      <Box width={2} flexShrink={0}>
        <Text color={colors.accent}>{active ? symbols.pointer : ' '}</Text>
      </Box>
      <Box width={checkbox ? 4 : 2} flexShrink={0}>
        <Text color={colors.accent}>{mark}</Text>
      </Box>
      <Box width={2} flexShrink={0}>
        <Text color={item.enabled ? colors.enabled : colors.disabled}>{item.enabled ? symbols.enabled : symbols.disabled}</Text>
      </Box>
      <Box width={30} flexShrink={0}>
        <Text wrap="truncate-end" bold={active} color={item.enabled ? colors.text : colors.disabled} strikethrough={!item.enabled}>
          {item.name}
        </Text>
      </Box>
      <Box width={8} flexShrink={0}>
        <Text color={kind.color}>{kind.label}</Text>
      </Box>
      <Box width={9} flexShrink={0}>
        <Text color={colors.muted}>{item.scope}</Text>
      </Box>
      <Box width={13} flexShrink={0} gap={1}>
        {item.usedBy.slice(0, 4).map((id) => (
          <Text key={id} color={harnessStyle[id].color}>
            {harnessStyle[id].tag}
          </Text>
        ))}
      </Box>
      <Box flexGrow={1} flexShrink={1} overflow="hidden">
        <Text wrap="truncate-end" color={hasIssue ? colors.warning : colors.muted}>
          {hasIssue ? `${symbols.warning} ${item.issues[0]}` : item.detail}
        </Text>
      </Box>
    </Box>
  );
}

export function ItemList({ items, cursor, marked, height, emptyMessage, checkboxes = false }: ItemListProps) {
  const [start, end] = visibleWindow(items.length, cursor, height);
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.border} height={height + 2} paddingRight={1}>
      {items.length === 0 ? (
        <Box justifyContent="center" flexGrow={1} alignItems="center">
          <Text color={colors.muted}>{emptyMessage}</Text>
        </Box>
      ) : (
        items.slice(start, end).map((item, i) => (
          <Row key={item.id} item={item} active={start + i === cursor} marked={marked.has(item.id)} checkbox={checkboxes} />
        ))
      )}
    </Box>
  );
}
