import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { CarouselTicker } from '../../src/ui/carousel-ticker/CarouselTicker';

/**
 * jsdom has no `matchMedia`, no `Element.animate`, and `getBoundingClientRect`
 * returns all zeroes. Without stubbing all three, `stridePx` is 0, the effect bails
 * early, and every animation assertion becomes meaningless while staying green.
 */
let animateSpy: ReturnType<typeof vi.fn>;
let mediaListeners: Array<(e: MediaQueryListEvent) => void>;

function setReducedMotion(matches: boolean) {
  mediaListeners = [];
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) =>
        mediaListeners.push(cb),
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }))
  );
}

beforeEach(() => {
  animateSpy = vi.fn(() => ({
    play: vi.fn(),
    pause: vi.fn(),
    cancel: vi.fn(),
    finish: vi.fn(),
  }));
  Object.defineProperty(Element.prototype, 'animate', {
    value: animateSpy,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
    value: () => ({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CarouselTicker', () => {
  it('creates NO animation under prefers-reduced-motion: reduce', () => {
    // This is a fixed bug. The marquee runs on the Web Animations API, so the
    // `@media (prefers-reduced-motion)` block in CarouselTicker.css CANNOT reach it -
    // that block was there from the start and never once stopped the marquee. It has
    // to be turned off in JS.
    setReducedMotion(true);
    render(
      <CarouselTicker>
        <span>alpha</span>
      </CarouselTicker>
    );
    return waitFor(() => {
      expect(animateSpy).not.toHaveBeenCalled();
    });
  });

  it('does create an animation when the user has not asked for reduced motion', () => {
    // The other direction. Without this case, a ticker that never ran at all would
    // make the case above green.
    setReducedMotion(false);
    render(
      <CarouselTicker>
        <span>alpha</span>
      </CarouselTicker>
    );
    return waitFor(() => {
      expect(animateSpy).toHaveBeenCalled();
    });
  });

  it('pins the content at the first frame under reduced motion, not transform 0', async () => {
    // With `cancel()` alone the transform returns to 0 and the leading
    // `aria-hidden` clones end up in the viewport instead of the real pattern.
    setReducedMotion(true);
    const { container } = render(
      <CarouselTicker overflowBufferPx={200}>
        <span>alpha</span>
      </CarouselTicker>
    );
    const content = container.querySelector<HTMLElement>('.tnt-carousel-ticker-content');
    await waitFor(() => {
      expect(content?.style.transform).toBe('translateX(-200px)');
    });
  });

  it('variants travel through data-attributes, not Tailwind classes', async () => {
    setReducedMotion(false);
    const { container } = render(
      <CarouselTicker direction="top" overflowVisible>
        <span>alpha</span>
      </CarouselTicker>
    );
    const root = container.querySelector('.tnt-carousel-ticker-root');
    expect(root?.getAttribute('data-orientation')).toBe('vertical');
    expect(root?.getAttribute('data-overflow')).toBe('visible');
    await waitFor(() => expect(animateSpy).toHaveBeenCalled());
  });

  it('uses NO raw Tailwind class in the JSX', async () => {
    setReducedMotion(false);
    const { container } = render(
      <CarouselTicker fade>
        <span>alpha</span>
      </CarouselTicker>
    );
    await waitFor(() => expect(animateSpy).toHaveBeenCalled());
    const classes = Array.from(container.querySelectorAll('*'))
      .flatMap((el) => Array.from(el.classList))
      .filter((c) => !c.startsWith('tnt-'));
    expect(classes).toEqual([]);
  });

  it('exactly ONE pattern is not aria-hidden - the rest are clones', async () => {
    setReducedMotion(false);
    const { container } = render(
      <CarouselTicker>
        <span>alpha</span>
      </CarouselTicker>
    );
    await waitFor(() => {
      const patterns = container.querySelectorAll('.tnt-carousel-ticker-pattern');
      expect(patterns.length).toBeGreaterThan(1);
      const visible = Array.from(patterns).filter((p) => p.getAttribute('aria-hidden') !== 'true');
      expect(visible).toHaveLength(1);
    });
  });
});
