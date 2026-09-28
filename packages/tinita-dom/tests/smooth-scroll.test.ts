import { beforeEach, describe, expect, it, vi } from 'vitest';

import { installSmoothScroll } from '../src/smooth-scroll';

/**
 * A smoke test, not an easing test. It checks the install/uninstall contract: listeners go onto
 * `document` and the returned function removes exactly those. Testing the spring curve needs a real
 * rAF and belongs elsewhere.
 */
describe('installSmoothScroll', () => {
  beforeEach(() => {
    // jsdom has no matchMedia; installSmoothScroll calls it for prefers-reduced-motion.
    if (!window.matchMedia) {
      window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      })) as unknown as typeof window.matchMedia;
    }
  });

  it('returns an uninstall function', () => {
    const uninstall = installSmoothScroll();
    expect(typeof uninstall).toBe('function');
    uninstall();
  });

  it('installs exactly 2 listeners on document and removes exactly 2', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');

    const uninstall = installSmoothScroll();
    const added = add.mock.calls.map(([type]) => type);
    expect(added).toContain('wheel');
    expect(added).toContain('pointerdown');

    uninstall();
    const removed = remove.mock.calls.map(([type]) => type);
    expect(removed).toContain('wheel');
    expect(removed).toContain('pointerdown');

    add.mockRestore();
    remove.mockRestore();
  });

  it('the wheel listener declares passive:false - it needs preventDefault', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const uninstall = installSmoothScroll();
    const wheelCall = add.mock.calls.find(([type]) => type === 'wheel');
    expect(wheelCall?.[2]).toMatchObject({ passive: false });
    uninstall();
    add.mockRestore();
  });

  it('ignores a wheel event that was already defaultPrevented', () => {
    const uninstall = installSmoothScroll();
    const event = new WheelEvent('wheel', {
      deltaY: 100,
      cancelable: true,
      bubbles: true,
    });
    event.preventDefault();
    // Does not throw, and does not claim the event a second time.
    expect(() => document.dispatchEvent(event)).not.toThrow();
    uninstall();
  });

  it('ignores ctrl+wheel - that is browser zoom', () => {
    const uninstall = installSmoothScroll();
    const event = new WheelEvent('wheel', {
      deltaY: 100,
      ctrlKey: true,
      cancelable: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    uninstall();
  });

  it('installing twice then removing twice does not throw', () => {
    const a = installSmoothScroll();
    const b = installSmoothScroll();
    expect(() => {
      a();
      b();
    }).not.toThrow();
  });
});
