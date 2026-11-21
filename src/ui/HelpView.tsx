import { Box, Text, useInput } from 'ink';
import { tildify, skillvipeHome } from '../core/paths.js';
import { colors } from './theme.js';

const SECTIONS: [string, [string, string][]][] = [
  [
    'Navigate',
    [
      ['↑ ↓  j k', 'move'],
      ['PgUp PgDn  g G', 'jump'],
      ['← →  h l', 'switch agent tab'],
      ['tab  1-4', 'filter: all / MCP / skills / plugins'],
      ['/', 'search by name or detail'],
    ],
  ],
  [
    'Act',
    [
      ['space', 'enable / disable (temporarily, reversible)'],
      ['m', 'mark item for bulk actions'],
      ['a', 'mark / unmark everything visible'],
      ['d  delete', 'remove permanently (with confirmation)'],
      ['c', 'cleanup: broken, missing and duplicate items, trash'],
      ['r', 'rescan'],
      ['q  esc', 'quit'],
    ],
  ],
];

export function HelpView({ onClose }: { onClose(): void }) {
  useInput(() => onClose());
  const home = tildify(skillvipeHome());
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.border} paddingX={2} paddingY={1} flexGrow={1}>
      {SECTIONS.map(([title, rows]) => (
        <Box key={title} flexDirection="column" marginBottom={1}>
          <Text bold color={colors.accent}>
            {title}
          </Text>
          {rows.map(([keys, action]) => (
            <Box key={keys}>
              <Box width={18}>
                <Text bold>{keys}</Text>
              </Box>
              <Text color={colors.muted}>{action}</Text>
            </Box>
          ))}
        </Box>
      ))}
      <Text bold color={colors.accent}>
        Safety
      </Text>
      <Text color={colors.muted}>Disabled items are parked in {home}/disabled or {home}/state.json and come back exactly as they were.</Text>
      <Text color={colors.muted}>Every config file is copied to {home}/backups before it changes. Removed folders go to {home}/trash.</Text>
      <Text color={colors.muted}>Folders shared by several agents (like ~/.agents/skills) affect every agent listed under "used by".</Text>
      <Box marginTop={1}>
        <Text color={colors.muted}>Press any key to go back.</Text>
      </Box>
    </Box>
  );
}
