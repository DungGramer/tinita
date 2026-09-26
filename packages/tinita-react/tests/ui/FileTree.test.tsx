import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { FileTree } from '../../src/ui/file-tree/FileTree';

const INDENT = ['src', '  index.ts', '  ui', '    button.tsx', 'README.md'].join('\n');
const CLI = ['D:\\PROJECT', '├───src', '│   └───components', '└───dist'].join('\n');

describe('FileTree', () => {
  it('render được định dạng thụt lề 2 space', () => {
    const { container } = render(<FileTree text={INDENT} />);
    const text = container.textContent ?? '';
    for (const name of ['src', 'index.ts', 'ui', 'button.tsx', 'README.md']) {
      expect(text).toContain(name);
    }
  });

  it('render được định dạng CLI tree', () => {
    const { container } = render(<FileTree text={CLI} />);
    const text = container.textContent ?? '';
    expect(text).toContain('src');
    expect(text).toContain('components');
    expect(text).toContain('dist');
    // Ký tự vẽ cây là cú pháp đầu vào, không phải nội dung - không được lọt ra DOM.
    expect(text).not.toContain('├');
    expect(text).not.toContain('└');
  });

  it('text rỗng không throw', () => {
    expect(() => render(<FileTree text="" />)).not.toThrow();
  });

  it('KHÔNG dùng class Tailwind thô nào trong JSX', () => {
    // Bundle không ship utility Tailwind nào, nên một class Tailwind trong JSX là
    // phụ thuộc NGẦM vào Tailwind của host.
    //
    // `lucide*` được loại trừ vì `lucide-react` tự gắn class lên `<svg>` của nó -
    // đó là class của third-party, không phải của tinita, và ta không kiểm soát.
    // Đo được 2026-09-26: `lucide`, `lucide-folder-open`, `lucide-file-code`.
    const { container } = render(<FileTree text={INDENT} />);
    const classes = Array.from(container.querySelectorAll('*'))
      .flatMap((el) => Array.from(el.classList))
      .filter((c) => !c.startsWith('tnt-') && !c.startsWith('lucide'));
    expect(classes).toEqual([]);
  });

  it('nhận className của người dùng mà không mất class gốc', () => {
    const { container } = render(<FileTree text={INDENT} className="host-x" />);
    const root = container.firstElementChild;
    expect(root?.classList.contains('host-x')).toBe(true);
    expect(root?.className).toContain('tnt-file-tree-root');
  });
});
