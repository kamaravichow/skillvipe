import { Box, Text } from 'ink';
import { colors } from './theme.js';

export type Tone = 'info' | 'success' | 'error';

export interface Status {
  text: string;
  tone: Tone;
}

const toneColor: Record<Tone, string> = { info: colors.muted, success: colors.enabled, error: colors.danger };

export function StatusLine({ status }: { status: Status | null }) {
  return (
    <Box paddingX={2} height={1}>
      {status && (
        <Text wrap="truncate-end" color={toneColor[status.tone]}>
          {status.text}
        </Text>
      )}
    </Box>
  );
}

/** A row of `key action` hints, e.g. [['space', 'toggle'], ['d', 'remove']]. */
export function KeyHints({ hints }: { hints: [string, string][] }) {
  return (
    <Box paddingX={1} gap={2} flexWrap="wrap">
      {hints.map(([key, action]) => (
        <Text key={key}>
          <Text bold color={colors.accent}>
            {key}
          </Text>
          <Text color={colors.muted}> {action}</Text>
        </Text>
      ))}
    </Box>
  );
}
