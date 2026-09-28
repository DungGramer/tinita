import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Ping } from '../../src/ui/ping/Ping';

describe('Ping', () => {
  it('renders a div without onClick and an anchor with one', () => {
    const { container, unmount } = render(<Ping />);
    expect(container.firstElementChild?.tagName).toBe('DIV');
    expect(container.firstElementChild?.getAttribute('role')).toBeNull();
    unmount();

    render(<Ping onClick={() => {}} />);
    const anchor = screen.getByRole('button');
    expect(anchor.tagName).toBe('A');
    expect(anchor.getAttribute('tabindex')).toBe('0');
  });

  it('count={0} renders inside the span, not as bare text', () => {
    // Regression: the old condition was `{count && <span>}`. With `count={0}`,
    // `0 &&` returns the number 0, and React RENDERS the number 0 - producing a bare
    // "0" outside the span with no class at all. Not "renders nothing", as intuition
    // suggests.
    const { container } = render(<Ping count={0} />);
    const span = container.querySelector('.tnt-ping-count');
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe('0');
  });

  it('no count prop means no count node at all', () => {
    const { container } = render(<Ping />);
    expect(container.querySelector('.tnt-ping-count')).toBeNull();
  });

  it('adds the offset class only when a prefix is present', () => {
    const { container, unmount } = render(<Ping count={3} />);
    expect(container.querySelector('.tnt-ping-body-offset')).toBeNull();
    unmount();

    const withPrefix = render(<Ping count={3} prefix={<span>pre</span>} />);
    expect(withPrefix.container.querySelector('.tnt-ping-body-offset')).not.toBeNull();
  });

  it('uses NO raw Tailwind class in the JSX', () => {
    // The bundle deliberately ships no Tailwind utilities. A Tailwind class in the
    // JSX is an IMPLICIT dependency on the host's Tailwind: without it the
    // component's layout breaks. Measured before the fix: `.tnt-ping` got
    // `display: block` instead of `inline-flex`.
    const { container } = render(<Ping count={3} prefix={<span>pre</span>} />);
    const classes = Array.from(container.querySelectorAll('*'))
      .flatMap((el) => Array.from(el.classList))
      .filter((c) => !c.startsWith('tnt-'));
    expect(classes).toEqual([]);
  });

  it('both dots are decorative and must be aria-hidden', () => {
    const { container } = render(<Ping />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  it('gọi onClick khi click', async () => {
    const onClick = vi.fn();
    render(<Ping onClick={onClick} />);
    screen.getByRole('button').click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
