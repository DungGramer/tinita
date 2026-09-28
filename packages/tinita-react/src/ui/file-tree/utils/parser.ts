/**
 * Parser for text tree strings.
 *
 * Two formats:
 * - two-space indent
 * - Windows/Unix CLI tree (`├──`, `└──`, `+---`, `\---`)
 *
 * Plus the description syntax: `name  ? description`.
 */

import type { ParsedNode } from '../types';

function normalizeText(raw: string): string {
  return raw.replace(/\r\n?/g, '\n');
}

function isCliTreeFormat(text: string): boolean {
  return /[├└]─+|[|+\\]---/.test(text);
}

/**
 * Split `name  ? description`.
 *
 * The separator REQUIRES leading whitespace. Without it `foo?.ts` or `query?param`
 * would be cut in half - a file name containing `?` is legal on Unix. Whitespace
 * after the `?` is optional, so `name ?desc` still parses.
 */
function splitDescription(raw: string): { name: string; description?: string } {
  const match = raw.match(/^(.*?)\s+\?\s*(.*)$/);
  if (!match) return { name: raw.trim() };
  const name = (match[1] ?? '').trim();
  const description = (match[2] ?? '').trim();
  if (!name) return { name: raw.trim() };
  return description ? { name, description } : { name };
}

/**
 * Create a node. `children` is `undefined` for a file and `[]` for a folder.
 *
 * A trailing `/` is the only signal separating an empty folder from a file.
 */
function makeNode(rawName: string, parentPath: string): ParsedNode {
  const { name, description } = splitDescription(rawName);
  const isExplicitFolder = name.endsWith('/');
  const displayName = isExplicitFolder ? name.slice(0, -1) : name;
  const path = parentPath ? `${parentPath}/${displayName}` : displayName;

  return {
    name: displayName,
    path,
    ...(description !== undefined ? { description } : {}),
    ...(isExplicitFolder ? { children: [] } : {}),
  };
}

/** A folder with children must have a `children` array, even if it arrived as a file. */
function asFolder(node: ParsedNode): ParsedNode {
  if (!node.children) node.children = [];
  return node;
}

function parseCliTree(text: string): ParsedNode[] {
  const lines = normalizeText(text)
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const rootRaw = lines[0]!.trim();
  const { name: rootNameRaw, description: rootDescription } = splitDescription(rootRaw);
  const rootName =
    rootNameRaw
      .replace(/[\\/]$/, '')
      .split(/[\\/]/)
      .pop() || rootNameRaw;

  const root: ParsedNode = {
    name: rootName,
    path: rootName,
    children: [],
    ...(rootDescription !== undefined ? { description: rootDescription } : {}),
  };
  const stack: Array<{ depth: number; node: ParsedNode }> = [{ depth: 0, node: root }];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i]!;

    // Replace connectors with spaces so depth can be counted.
    const stripped = raw.replace(/[│├└─|+\\]/g, ' ');
    const leadingSpaces = stripped.match(/^ */)?.[0].length ?? 0;
    const depth = Math.floor(leadingSpaces / 4) + 1;

    const nameMatch = raw.match(/[├└+\\]─+\s*(.+)$/) || raw.match(/[|+]---\s*(.+)$/);
    if (!nameMatch) continue;
    const rawName = nameMatch[1]!.trim();
    if (!rawName) continue;

    while (stack.length && stack[stack.length - 1]!.depth >= depth) {
      stack.pop();
    }
    const parentFrame = stack[stack.length - 1];
    if (!parentFrame) continue;

    const parent = asFolder(parentFrame.node);
    const node = makeNode(rawName, parent.path);
    parent.children!.push(node);
    stack.push({ depth, node });
  }

  return [root];
}

function parseIndentTree(text: string): ParsedNode[] {
  const indentation = '  ';
  const lines = normalizeText(text).trim().split(/\n+/);

  const result: ParsedNode[] = [];
  const path: Array<{ depth: number; node: ParsedNode }> = [];

  for (let raw of lines) {
    if (!raw.trim()) continue;

    let depth = 0;
    while (raw.startsWith(indentation)) {
      depth++;
      raw = raw.slice(indentation.length);
    }
    if (!raw.trim()) continue;

    if (depth === 0) {
      const node = makeNode(raw, '');
      result.push(node);
      path.length = 0;
      path.push({ depth, node });
      continue;
    }

    while (path.length && path[path.length - 1]!.depth >= depth) {
      path.pop();
    }

    const parentFrame = path[path.length - 1];
    if (!parentFrame) continue;

    const parent = asFolder(parentFrame.node);
    const node = makeNode(raw, parent.path);
    parent.children!.push(node);
    path.push({ depth, node });
  }

  return result;
}

/** Auto-detect the format. */
export function parseFileTreeUniversal(text: string): ParsedNode[] {
  const normalized = normalizeText(text);
  return isCliTreeFormat(normalized) ? parseCliTree(normalized) : parseIndentTree(normalized);
}
