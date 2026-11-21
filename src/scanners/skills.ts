import path from 'node:path';
import { exists, isBrokenLink, isDirectory, listDir, readText } from '../core/fs.js';
import type { HarnessId, Item, SkillsDirSource } from '../core/types.js';
import { sourceKey } from './common.js';
import { listPathEntries, makePathItem } from './path-items.js';

/** Reads `description:` from a SKILL.md frontmatter block. */
function readSkillDescription(skillMd: string): string {
  const text = readText(skillMd);
  const frontmatter = text?.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  if (!frontmatter) return '';
  const lines = frontmatter.split(/\r?\n/);
  const index = lines.findIndex((line) => /^description\s*:/.test(line));
  if (index === -1) return '';
  let value = lines[index].replace(/^description\s*:\s*/, '').trim();
  if (value === '' || value === '>' || value === '|' || value === '>-' || value === '|-') {
    value = lines
      .slice(index + 1)
      .filter((line) => /^\s+\S/.test(line))
      .map((line) => line.trim())
      .join(' ');
  }
  return value.replace(/^["']|["']$/g, '');
}

function skillIssues(currentPath: string): string[] {
  if (isBrokenLink(currentPath)) return ['broken symlink'];
  if (!exists(path.join(currentPath, 'SKILL.md'))) return ['missing SKILL.md'];
  return [];
}

/**
 * A folder without its own SKILL.md whose sub-folders hold skills is a container managed by
 * the harness (e.g. Claude's cloud-synced `skills/synced`), not a broken skill.
 */
function isSkillContainer(dir: string, depth = 2): boolean {
  if (depth === 0 || exists(path.join(dir, 'SKILL.md'))) return false;
  return listDir(dir)
    .filter((entry) => entry.isDirectory())
    .some((entry) => {
      const child = path.join(dir, entry.name);
      return exists(path.join(child, 'SKILL.md')) || isSkillContainer(child, depth - 1);
    });
}

export function scanSkillsDir(source: SkillsDirSource, usedBy: HarnessId[]): Item[] {
  const key = sourceKey(source);
  return listPathEntries(source.dir, (_name, full) => isDirectory(full) && !isSkillContainer(full)).map((entry) =>
    makePathItem({
      entry,
      idPrefix: key,
      kind: 'skill',
      scope: source.scope,
      usedBy,
      detail: readSkillDescription(path.join(entry.currentPath, 'SKILL.md')),
      issues: skillIssues(entry.currentPath),
    }),
  );
}
