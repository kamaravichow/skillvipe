import { Box, Text, useInput } from 'ink';
import { colors } from './theme.js';

interface ConfirmDialogProps {
  title: string;
  lines: string[];
  note?: string;
  onConfirm(): void;
  onCancel(): void;
}

const MAX_LINES = 3;

export function ConfirmDialog({ title, lines, note, onConfirm, onCancel }: ConfirmDialogProps) {
  useInput((input, key) => {
    if (input === 'y' || input === 'Y') onConfirm();
    else if (input === 'n' || input === 'N' || key.escape) onCancel();
  });

  const hidden = lines.length - MAX_LINES;
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.danger} paddingX={1} height={5}>
      <Text>
        <Text bold color={colors.danger}>
          {title}
        </Text>
        <Text color={colors.muted}>  press </Text>
        <Text bold color={colors.danger}>
          y
        </Text>
        <Text color={colors.muted}> to confirm, </Text>
        <Text bold>n</Text>
        <Text color={colors.muted}> to cancel</Text>
      </Text>
      <Text wrap="truncate-end" color={colors.text}>
        {lines.slice(0, MAX_LINES).join(', ')}
        {hidden > 0 ? ` and ${hidden} more` : ''}
      </Text>
      {note && (
        <Text wrap="truncate-end" color={colors.muted}>
          {note}
        </Text>
      )}
    </Box>
  );
}
