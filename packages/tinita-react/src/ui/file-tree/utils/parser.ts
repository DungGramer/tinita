/**
 * Parser cho chuỗi cây dạng văn bản.
 *
 * Hai định dạng:
 * - thụt lề 2 dấu cách
 * - cây CLI của Windows/Unix (`├──`, `└──`, `+---`, `\---`)
 *
 * Và cú pháp chú thích: `tên  ? mô tả`.
 */

import type { ParsedNode } from '../types';

function normalizeText(raw: string): string {
  return raw.replace(/\r\n?/g, '\n');
}

function isCliTreeFormat(text: string): boolean {
  return /[├└]─+|[|+\\]---/.test(text);
}

/**
 * Tách `tên  ? mô tả`.
 *
 * Dấu phân cách BẮT BUỘC có khoảng trắng đứng trước. Nếu không thì `foo?.ts` hay
 * `query?param` sẽ bị cắt làm đôi - tên file có dấu `?` là hợp lệ trên Unix.
 * Sau `?` thì khoảng trắng là tuỳ chọn, để `name ?desc` vẫn hiểu được.
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
 * Tạo node. `children` là `undefined` cho file và `[]` cho thư mục.
 *
 * Dấu `/` ở cuối là tín hiệu DUY NHẤT phân biệt thư mục rỗng với file. Bản cũ dùng
 * `children.length > 0` nên thư mục rỗng hiển thị y hệt một file.
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

/** Thư mục có con thì phải có mảng `children`, kể cả khi vào là file. */
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

    // Thay connector bằng khoảng trắng để đếm được độ sâu.
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

/** Tự nhận định dạng. */
export function parseFileTreeUniversal(text: string): ParsedNode[] {
  const normalized = normalizeText(text);
  return isCliTreeFormat(normalized) ? parseCliTree(normalized) : parseIndentTree(normalized);
}
