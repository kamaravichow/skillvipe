import type { Inventory } from './core/inventory.js';
import { tildify } from './core/paths.js';

const KIND_LABEL = { mcp: 'MCP servers', skill: 'Skills', plugin: 'Plugins' } as const;

const color = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
};

/** Prints the inventory for non-interactive use (`skillvipe list`, `skillvipe list --json`). */
export function printInventory(inventory: Inventory, asJson: boolean): void {
  if (asJson) {
    const items = inventory.items.map(({ ops: _ops, ...rest }) => rest);
    const harnesses = inventory.harnesses.map(({ harness, installed }) => ({ id: harness.id, name: harness.name, installed }));
    console.log(JSON.stringify({ harnesses, items, errors: inventory.errors }, null, 2));
    return;
  }

  for (const { harness, installed } of inventory.harnesses) {
    console.log('\n' + color.magenta(color.bold(`◆ ${harness.name}`)) + (installed ? '' : color.dim('  not installed')));
    if (!installed) continue;
    for (const kind of ['mcp', 'skill', 'plugin'] as const) {
      const items = inventory.items.filter((i) => i.kind === kind && i.usedBy.includes(harness.id));
      if (items.length === 0) continue;
      console.log(color.bold(`  ${KIND_LABEL[kind]} (${items.length})`));
      for (const item of items) {
        const dot = item.enabled ? color.green('●') : color.dim('○');
        const issues = item.issues.length ? color.yellow(`  ⚠ ${item.issues.join('; ')}`) : '';
        const scope = item.scope === 'project' ? color.dim(' [project]') : '';
        const where = item.kind === 'skill' ? '' : color.dim(`  ${tildify(item.location)}`);
        console.log(`    ${dot} ${item.name}${scope}${where}${issues}`);
      }
    }
  }

  const shared = inventory.items.filter((i) => i.usedBy.length > 1).length;
  console.log(color.dim(`\n${inventory.items.length} items, ${shared} shared between harnesses.`));
  for (const error of inventory.errors) console.log(color.red(`✖ ${tildify(error)}`));
}
