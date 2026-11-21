import { Box, Text } from 'ink';
import { colors } from './theme.js';

export interface Tab {
  key: string;
  label: string;
  count?: number;
  dimmed?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  hint?: string;
}

export function Tabs({ tabs, activeKey, hint }: TabsProps) {
  return (
    <Box paddingX={1} gap={1}>
      {hint && <Text color={colors.muted}>{hint}</Text>}
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        const label = tab.count === undefined ? tab.label : `${tab.label} ${tab.count}`;
        return (
          <Text
            key={tab.key}
            bold={active}
            color={active ? 'black' : tab.dimmed ? colors.disabled : colors.text}
            backgroundColor={active ? colors.accent : undefined}
          >
            {` ${label} `}
          </Text>
        );
      })}
    </Box>
  );
}
