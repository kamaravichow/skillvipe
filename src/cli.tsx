#!/usr/bin/env node
import path from 'node:path';
import { render } from 'ink';
import { scanInventory } from './core/inventory.js';
import { printInventory } from './list.js';
import { App } from './ui/App.js';

const HELP = `
skillvipe — manage MCP servers, skills and plugins across coding agents

Usage
  npx skillvipe                Open the interactive manager
  npx skillvipe list           Print everything that is installed
  npx skillvipe list --json    Same, as JSON

Options
  --cwd <dir>   Project folder to scan for project-level config (default: current folder)
  -h, --help    Show this help

Supported: Claude Code, Codex, OpenCode, Pi, Muse Code, Antigravity CLI.
Disabled items are parked in ~/.skillvipe; removed folders go to ~/.skillvipe/trash
and every edited config file is backed up to ~/.skillvipe/backups first.
`;

function parseArgs(argv: string[]) {
  const args = { command: 'ui', json: false, help: false, cwd: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') args.help = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--cwd') args.cwd = path.resolve(argv[++i] ?? '.');
    else if (arg === 'list' || arg === 'ls') args.command = 'list';
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  if (args.command === 'list' || !process.stdin.isTTY) {
    printInventory(scanInventory(args.cwd), args.json);
    return;
  }
  const instance = render(<App cwd={args.cwd} />, { alternateScreen: true });
  await instance.waitUntilExit();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
