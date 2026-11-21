import { applyEdits, modify, parse, type ParseError } from 'jsonc-parser';
import { backupFile, readText, writeTextAtomic } from './fs.js';

export type JsonPath = (string | number)[];

/** Reads JSON or JSONC. Returns undefined when the file is missing or unparsable. */
export function readJson(file: string): unknown {
  const text = readText(file);
  if (text === undefined) return undefined;
  const errors: ParseError[] = [];
  const value = parse(text, errors, { allowTrailingComma: true });
  return errors.length > 0 && value === undefined ? undefined : value;
}

export function getAt(root: unknown, jsonPath: JsonPath): unknown {
  let node = root;
  for (const key of jsonPath) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string | number, unknown>)[key];
  }
  return node;
}

function detectIndent(text: string): { insertSpaces: boolean; tabSize: number } {
  const match = text.match(/^([ \t]+)\S/m);
  if (!match) return { insertSpaces: true, tabSize: 2 };
  if (match[1].startsWith('\t')) return { insertSpaces: false, tabSize: 1 };
  return { insertSpaces: true, tabSize: match[1].length };
}

/**
 * Sets (or deletes, when value is undefined) one value in a JSON/JSONC file while keeping
 * the rest of the file's formatting and comments intact.
 */
export async function editJson(file: string, jsonPath: JsonPath, value: unknown): Promise<void> {
  const text = readText(file) ?? '{}\n';
  const edits = modify(text, jsonPath, value, {
    formattingOptions: { ...detectIndent(text), eol: '\n' },
  });
  if (edits.length === 0) return;
  await backupFile(file);
  await writeTextAtomic(file, applyEdits(text, edits));
}
