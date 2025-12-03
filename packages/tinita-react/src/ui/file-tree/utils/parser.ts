/**
 * Text Tree Parser Utilities
 *
 * Supports:
 * - Indent-based tree (2 spaces)
 * - CLI tree format (Windows/Unix)
 */

import type { FileNode } from '../types';

/**
 * Normalize line endings
 */
function normalizeText(raw: string): string {
  return raw.replace(/\r\n?/g, '\n');
}

/**
 * Detect if text is CLI tree format
 */
function isCliTreeFormat(text: string): boolean {
  // phát hiện kí tự tree như ├──, └──, |---, +---
  return /[├└]─+|[|+\\]---/.test(text);
}

/**
 * Parse CLI tree format (Windows / Unix)
 */
function parseCliTree(text: string): FileNode[] {
  const lines = normalizeText(text)
    .split('\n')
    .map((l) => l.replace(/\s+$/g, ''))
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Dòng đầu: path root (D:\..., C:\..., /home/...)
  const rootLine = lines[0].trim();
  const rootName =
    rootLine.replace(/[\\/]$/, '').split(/[\\/]/).pop() || rootLine;

  const root: FileNode = { name: rootName, children: [] };
  const stack: { depth: number; node: FileNode }[] = [{ depth: 0, node: root }];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];

    // "Stripped" để tính depth: thay kí tự connector bằng khoảng trắng
    const stripped = raw.replace(/[│├└─|+\\]/g, ' ');
    const leadingSpaces = stripped.match(/^ */)?.[0].length ?? 0;

    // Mỗi level của CLI tree thường tương ứng ~4 spaces
    const depth = Math.floor(leadingSpaces / 4) + 1;

    // Lấy tên sau connector (├───, └───, +---, \---, |---)
    const nameMatch =
      raw.match(/[├└+\\]─+\s*(.+)$/) || raw.match(/[|+]---\s*(.+)$/);

    if (!nameMatch) continue;
    const name = nameMatch[1].trim();
    if (!name) continue;

    // Thu nhỏ stack về đúng parent depth
    while (stack.length && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    const parentFrame = stack[stack.length - 1];
    if (!parentFrame) continue;

    const parent = parentFrame.node;
    const node: FileNode = { name, children: [] };
    parent.children.push(node);
    stack.push({ depth, node });
  }

  return [root];
}

/**
 * Parse indent tree format (2 spaces)
 */
function parseIndentTree(text: string): FileNode[] {
  const indentation = '  ';
  const lines = normalizeText(text).trim().split(/\n+/);

  const result: FileNode[] = [];
  const path: { depth: number; node: FileNode }[] = [];

  for (let raw of lines) {
    if (!raw.trim()) continue;

    let depth = 0;
    while (raw.startsWith(indentation)) {
      depth++;
      raw = raw.slice(indentation.length);
    }
    const name = raw.trim();
    if (!name) continue;

    const node: FileNode = { name, children: [] };

    if (depth === 0) {
      result.push(node);
      path.length = 0;
      path.push({ depth, node });
      continue;
    }

    // Tìm parent có depth < current depth
    while (path.length && path[path.length - 1].depth >= depth) {
      path.pop();
    }

    const parentFrame = path[path.length - 1];
    if (!parentFrame) continue;

    parentFrame.node.children.push(node);
    path.push({ depth, node });
  }

  return result;
}

/**
 * Universal parser - Auto-detect format
 */
export function parseFileTreeUniversal(text: string): FileNode[] {
  const normalized = normalizeText(text);
  if (isCliTreeFormat(normalized)) {
    return parseCliTree(normalized);
  }
  return parseIndentTree(normalized);
}
