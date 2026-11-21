import type { ReactNode } from 'react';
import { Box, Text } from 'ink';
import { HARNESS_NAMES } from '../harnesses/index.js';
import { tildify } from '../core/paths.js';
import type { Item } from '../core/types.js';
import { colors, harnessStyle, kindStyle } from './theme.js';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Box width={10} flexShrink={0}>
        <Text color={colors.muted}>{label}</Text>
      </Box>
      <Box flexGrow={1}>{children}</Box>
    </Box>
  );
}

export function DetailPane({ item }: { item: Item | undefined }) {
  if (!item) return <Box height={5} />;
  const kind = kindStyle[item.kind];
  return (
    <Box flexDirection="column" paddingX={2} height={5}>
      <Box gap={1}>
        <Text bold color={colors.text}>
          {item.name}
        </Text>
        <Text color={kind.color}>{kind.label}</Text>
        <Text color={item.enabled ? colors.enabled : colors.disabled}>{item.enabled ? 'enabled' : 'disabled'}</Text>
      </Box>
      <Field label="used by">
        <Text>
          {item.usedBy.map((id, i) => (
            <Text key={id} color={harnessStyle[id].color}>
              {i > 0 ? ', ' : ''}
              {HARNESS_NAMES[id]}
            </Text>
          ))}
        </Text>
      </Field>
      <Field label="location">
        <Text wrap="truncate-middle" color={colors.text}>
          {tildify(item.location)}
        </Text>
      </Field>
      <Field label={item.issues.length ? 'issues' : 'details'}>
        <Text wrap="truncate-end" color={item.issues.length ? colors.warning : colors.muted}>
          {item.issues.length ? item.issues.join(' · ') : item.detail || '—'}
        </Text>
      </Field>
    </Box>
  );
}
