import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { FileTree } from '../../src/ui/file-tree/FileTree';

const INDENT = ['src', '  index.ts', '  ui', '    button.tsx', 'README.md'].join('\n');
const CLI = ['D:\\PROJECT', '├───src', '│   └───components', '└───dist'].join('\n');

describe('FileTree', () => {
  it('renders the two-space indent format', () => {
    const { container } = render(<FileTree text={INDENT} />);
    const text = container.textContent ?? '';
    for (const name of ['src', 'index.ts', 'ui', 'button.tsx', 'README.md']) {
      expect(text).toContain(name);
    }
  });

  it('renders the CLI tree format', () => {
    const { container } = render(<FileTree text={CLI} />);
    const text = container.textContent ?? '';
    expect(text).toContain('src');
    expect(text).toContain('components');
    expect(text).toContain('dist');
    // The box-drawing characters are input syntax, not content - they must not
    // reach the DOM.
    expect(text).not.toContain('├');
    expect(text).not.toContain('└');
  });

  it('empty text does not throw', () => {
    expect(() => render(<FileTree text="" />)).not.toThrow();
  });

  it('uses NO raw Tailwind class in the JSX', () => {
    // The bundle ships no Tailwind utilities, so a Tailwind class in the JSX is an
    // IMPLICIT dependency on the host's Tailwind.
    //
    // `lucide*` is excluded because `lucide-react` puts its own classes on its
    // `<svg>` - those are third-party classes, not tinita's, and out of our control.
    // Measured 2026-09-26: `lucide`, `lucide-folder-open`, `lucide-file-code`.
    const { container } = render(<FileTree text={INDENT} />);
    const classes = Array.from(container.querySelectorAll('*'))
      .flatMap((el) => Array.from(el.classList))
      .filter((c) => !c.startsWith('tnt-') && !c.startsWith('lucide'));
    expect(classes).toEqual([]);
  });

  it('accepts the caller className without losing its own', () => {
    const { container } = render(<FileTree text={INDENT} className="host-x" />);
    const root = container.firstElementChild;
    expect(root?.classList.contains('host-x')).toBe(true);
    expect(root?.className).toContain('tnt-file-tree-root');
  });
});
