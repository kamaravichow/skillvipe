import type { HarnessId, ItemKind } from '../core/types.js';

export const colors = {
  accent: '#c084fc',
  accentDim: '#7c3aed',
  text: '#e5e7eb',
  muted: 'gray',
  enabled: '#4ade80',
  disabled: '#6b7280',
  warning: '#facc15',
  danger: '#f87171',
  selection: '#312e81',
  border: '#4c1d95',
} as const;

export const kindStyle: Record<ItemKind, { label: string; color: string }> = {
  mcp: { label: 'MCP', color: '#38bdf8' },
  skill: { label: 'SKILL', color: '#f472b6' },
  plugin: { label: 'PLUGIN', color: '#fb923c' },
};

export const harnessStyle: Record<HarnessId, { tag: string; color: string }> = {
  claude: { tag: 'CC', color: '#d97757' },
  codex: { tag: 'CX', color: '#10a37f' },
  opencode: { tag: 'OC', color: '#a3a3a3' },
  pi: { tag: 'PI', color: '#eab308' },
  muse: { tag: 'MU', color: '#0866ff' },
  antigravity: { tag: 'AG', color: '#4285f4' },
};

export const symbols = {
  enabled: '●',
  disabled: '○',
  marked: '✔',
  pointer: '❯',
  warning: '⚠',
  diamond: '◆',
} as const;
