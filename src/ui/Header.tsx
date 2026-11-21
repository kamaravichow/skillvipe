import { Box, Text } from 'ink';
import type { Item } from '../core/types.js';
import { colors, symbols } from './theme.js';

const TITLE = 'skillvipe';
const GRADIENT = ['#f0abfc', '#e879f9', '#d946ef', '#c084fc', '#a78bfa', '#818cf8', '#60a5fa', '#38bdf8', '#22d3ee'];

export function Header({ items }: { items: Item[] }) {
  const enabled = items.filter((i) => i.enabled).length;
  const issues = items.filter((i) => i.issues.length > 0).length;
  return (
    <Box paddingX={1} justifyContent="space-between">
      <Box>
        <Text color={colors.accent}>{symbols.diamond} </Text>
        {[...TITLE].map((ch, i) => (
          <Text key={i} bold color={GRADIENT[i % GRADIENT.length]}>
            {ch}
          </Text>
        ))}
        <Text color={colors.muted}>  MCP servers · skills · plugins for your coding agents</Text>
      </Box>
      <Box gap={2}>
        <Text color={colors.enabled}>
          {symbols.enabled} {enabled} on
        </Text>
        <Text color={colors.disabled}>
          {symbols.disabled} {items.length - enabled} off
        </Text>
        {issues > 0 && (
          <Text color={colors.warning}>
            {symbols.warning} {issues} issues
          </Text>
        )}
      </Box>
    </Box>
  );
}
