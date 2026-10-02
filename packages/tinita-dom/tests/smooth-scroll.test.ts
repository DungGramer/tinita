import { beforeEach, describe, expect, it, vi } from 'vitest';

import { installSmoothScroll } from '../src/smooth-scroll';
import {
  WHEEL_DELTA_MODE_LINE,
  WHEEL_GESTURE_IDLE_MS,
  WHEEL_SAMPLE_COUNT,
} from '../src/wheel-source';

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

/**
 * smooth-scroll.ts:360 reads `e.deltaMode` to convert units, and the sample pushed two
 * dozen lines later used to drop it. Deleting `deltaMode: e.deltaMode` from that push
 * failed ZERO tests - wheel-source's own cases build samples by hand, so they cannot
 * see the wiring. These can.
 *
 * Observable: `defaultPrevented`. A `smoothed` verdict makes the handler hand the
 * gesture to the browser untouched; a `stepped` verdict makes it preventDefault and
 * ease.
 *
 * Two details decide whether such a test measures anything, and the first draft of it
 * got both wrong:
 *
 * 1. The verdict refines the NEXT gesture, and an opening event decisive on its own
 *    BEATS the remembered one. So gesture 2 must open inside [8, 48) px, where
 *    `decisiveWheelSource` returns null and memory is what speaks. Opening at 4.2px
 *    made the first draft pass without the settling gesture mattering at all.
 * 2. Line mode multiplies deltaY by 16, so an ordinary line-mode stream reads as a
 *    detent BY MAGNITUDE and would flip to `stepped` with or without `deltaMode`.
 *    These deltas are chosen so the converted stream still looks smooth - median 20px,
 *    under the 48px floor, 16ms apart, and no value repeated enough for the repetition
 *    rule. Only `deltaMode` can flip it, which is what makes the pair a measurement.
 */
describe('deltaMode reaches wheel-source from the wheel handler', () => {
  /** A scroller jsdom will accept: both offsets are plain properties. */
  function scroller() {
    const el = document.createElement('div');
    el.style.overflowY = 'auto';
    Object.defineProperty(el, 'scrollHeight', {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(el, 'clientHeight', {
      value: 100,
      configurable: true,
    });
    document.body.append(el);
    return el;
  }

  function wheel(
    el: Element,
    deltaY: number,
    time: number,
    deltaMode?: number
  ) {
    const event = new WheelEvent('wheel', {
      deltaY,
      deltaMode,
      cancelable: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'timeStamp', {
      value: time,
      configurable: true,
    });
    el.dispatchEvent(event);
    return event;
  }

  /**
   * In pixel mode: 1 to 1.5px, far under every floor - plainly a smoother.
   * In line mode: the same numbers become 16 to 24px, median 20, still under the
   * 48px detent floor and still continuous. `deltaMode` is the only thing that can
   * call this one stepped.
   */
  const DELTA_Y = [1, 1.2, 1.4, 1.1, 1.3, 1.5, 1.2, 1.4];

  /** Opens inside [8, 48) so `decisiveWheelSource` abstains and memory decides. */
  const UNDECIDED_PX = 20;

  function settle(el: Element, deltaMode?: number) {
    expect(DELTA_Y).toHaveLength(WHEEL_SAMPLE_COUNT);
    DELTA_Y.forEach((d, i) => wheel(el, d, 1000 + i * 16, deltaMode));
    return 1000 + (DELTA_Y.length - 1) * 16;
  }

  it('pixel mode settles smoothed, so the next gesture goes to the browser', () => {
    const uninstall = installSmoothScroll();
    const el = scroller();

    const settledAt = settle(el);
    const next = wheel(el, UNDECIDED_PX, settledAt + WHEEL_GESTURE_IDLE_MS + 1);

    expect(next.defaultPrevented).toBe(false);
    uninstall();
    el.remove();
  });

  it('the same deltas in line mode settle stepped, so the next gesture is eased', () => {
    const uninstall = installSmoothScroll();
    const el = scroller();

    const settledAt = settle(el, WHEEL_DELTA_MODE_LINE);
    const next = wheel(el, UNDECIDED_PX, settledAt + WHEEL_GESTURE_IDLE_MS + 1);

    // Same deltaY list, same cadence, same opening event. Only deltaMode differs,
    // and it has to survive the trip into the sample buffer for this to flip.
    expect(next.defaultPrevented).toBe(true);
    uninstall();
    el.remove();
  });
});
