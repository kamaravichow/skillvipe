import os from 'node:os';
import path from 'node:path';

export const home = os.homedir();

export function fromHome(...segments: string[]): string {
  return path.join(home, ...segments);
}

export function xdgConfigHome(): string {
  return process.env.XDG_CONFIG_HOME || fromHome('.config');
}

/** Root folder for skillvipe's own state, stashed items, backups and trash. */
export function skillvipeHome(): string {
  return process.env.SKILLVIPE_HOME || fromHome('.skillvipe');
}

/** Replaces the home directory prefix with `~` for display. */
export function tildify(p: string): string {
  return p === home || p.startsWith(home + path.sep) ? '~' + p.slice(home.length) : p;
}
