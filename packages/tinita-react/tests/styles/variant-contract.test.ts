import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Hợp đồng giữa variant trong JSX và selector trong CSS.
 *
 * Hai thứ này lệch nhau là im lặng: prop đổi tên thì CSS không khớp nữa và component
 * chỉ mất style, không ai báo. Đây là cửa chặn duy nhất.
 */
const SRC = resolve(__dirname, '../../src');
const UI = resolve(SRC, 'ui');

function walk(dir: string, test: (name: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, test));
    else if (test(entry)) out.push(full);
  }
  return out;
}

const tsxFiles = walk(UI, (n) => n.endsWith('.tsx')).map((path) => ({
  path,
  rel: path.slice(SRC.length + 1),
  code: readFileSync(path, 'utf8'),
}));

const cssFiles = walk(UI, (n) => n.endsWith('.module.css')).map((path) => ({
  path,
  rel: path.slice(SRC.length + 1),
  css: readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
}));

/** `data-x` mà CSS nhắm tới, bất kể có kèm giá trị hay không. */
const cssAttributes = new Set(
  cssFiles.flatMap(({ css }) =>
    [...css.matchAll(/\[(data-[a-z-]+)[^\]]*\]/g)].map((m) => m[1] as string)
  )
);

describe('hợp đồng variant', () => {
  it('có file để kiểm - nếu không, mọi ca dưới đây xanh giả', () => {
    expect(tsxFiles.length).toBeGreaterThanOrEqual(3);
    expect(cssAttributes.size).toBeGreaterThanOrEqual(5);
  });

  it('KHÔNG component nào viết `data-*` thẳng trong JSX', () => {
    // Mọi variant/state phải đi qua `variantAttributes`. Viết tay thì mỗi chỗ một
    // quy ước boolean, và `data-x={false}` của React với `data-x="false"` của resolver
    // là hai thứ khác nhau khi prop là `undefined`.
    const bad: string[] = [];
    for (const { rel, code } of tsxFiles) {
      const withoutComments = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const m of withoutComments.matchAll(/(?:^|\s)(data-[a-z-]+)=/g)) {
        bad.push(`${rel}: ${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('mọi `data-*` mà CSS nhắm tới đều được component phát ra', () => {
    // Chiều này bắt việc đổi tên prop mà quên CSS, và CSS chết trong im lặng.
    // Do Base UI `Collapsible` đặt, không phải tinita. `data-starting-style` và
    // `data-ending-style` chỉ tồn tại trong lúc transition vào/ra chạy; CSS của ta
    // đọc chúng theo đúng mẫu trong docs của Base UI.
    //
    // `data-disabled` từng có 2 rule trong FileTree.module.css nhưng `disabled` chưa
    // bao giờ được truyền xuống - đo được 0 element mang nó, đã xoá rule chứ không
    // đưa vào allowlist.
    const fromLibrary = new Set([
      'data-open',
      'data-closed',
      'data-starting-style',
      'data-ending-style',
    ]);
    const emitted = new Set<string>();
    for (const { code } of tsxFiles) {
      for (const m of code.matchAll(/variantAttributes\(\{([\s\S]*?)\}\)/g)) {
        // `(?=[,:}]|$)`: regex ngoài đã ăn mất `}`, nên với shorthand một key
        // (`variantAttributes({ level })`) block chỉ còn `" level "` và một delimiter
        // BẮT BUỘC ở đuôi sẽ không bao giờ khớp. `data-level` từng lọt vì đúng lỗi này.
        for (const k of (m[1] as string).matchAll(/(?:^|[\s,{])([a-zA-Z][\w]*)\s*(?=[,:}]|$)/g)) {
          const key = k[1] as string;
          emitted.add(`data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`);
        }
      }
    }
    const missing = [...cssAttributes].filter((a) => !emitted.has(a) && !fromLibrary.has(a));
    expect(missing).toEqual([]);
  });
});
