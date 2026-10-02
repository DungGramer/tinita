import { describe, expect, it } from 'vitest';

import {
  BUBBLE_SIZE,
  bubbleRestPosition,
  centredGeometry,
  clamp,
  clampWindow,
  EDGE_MARGIN,
  HEADER_VISIBLE,
  MIN_HEIGHT,
  MIN_WIDTH,
  snapSideFor,
  snapToEdge,
} from '../../src/ui/floating-window/geometry';

const DESKTOP = { width: 1440, height: 900 };

describe('clamp', () => {
  it('keeps a value inside the range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
    expect(clamp(-10, 0, 100)).toBe(0);
    expect(clamp(999, 0, 100)).toBe(100);
  });

  // A viewport narrower than MIN_WIDTH really does produce max < min, and a phone in
  // landscape is how you get there. Written the other way round - max() outermost -
  // this returns `min` and pushes the window off the screen instead of onto it.
  it('returns max, not min, when the range is inverted', () => {
    expect(clamp(500, 320, 280)).toBe(280);
  });

  // min is a position on screen; NaN propagated through would give the element a
  // transform of `translate(NaNpx, NaNpx)` and it would simply not be painted.
  it('falls back to min for a non-finite value', () => {
    expect(clamp(Number.NaN, 12, 100)).toBe(12);
    expect(clamp(Number.POSITIVE_INFINITY, 12, 100)).toBe(12);
    expect(clamp(Number.NEGATIVE_INFINITY, 12, 100)).toBe(12);
  });
});

describe('snapSideFor', () => {
  it('decides on the centre of the square, not its left edge', () => {
    // A bubble whose left edge is just left of centre but whose middle is right of
    // it belongs to the right half. Measuring the edge sends it the wrong way.
    const justLeftOfCentre = DESKTOP.width / 2 - 1;
    expect(snapSideFor(justLeftOfCentre, BUBBLE_SIZE, DESKTOP.width)).toBe('right');
    expect(snapSideFor(0, BUBBLE_SIZE, DESKTOP.width)).toBe('left');
    expect(snapSideFor(1400, BUBBLE_SIZE, DESKTOP.width)).toBe('right');
  });
});

describe('snapToEdge', () => {
  it('sends x to an edge and leaves y where the user put it', () => {
    expect(snapToEdge({ x: 100, y: 400 }, BUBBLE_SIZE, DESKTOP)).toEqual({
      x: EDGE_MARGIN,
      y: 400,
      side: 'left',
    });
    expect(snapToEdge({ x: 1300, y: 400 }, BUBBLE_SIZE, DESKTOP)).toEqual({
      x: DESKTOP.width - BUBBLE_SIZE - EDGE_MARGIN,
      y: 400,
      side: 'right',
    });
  });

  it('clamps y into the viewport, keeping the edge margin', () => {
    expect(snapToEdge({ x: 0, y: -500 }, BUBBLE_SIZE, DESKTOP).y).toBe(EDGE_MARGIN);
    expect(snapToEdge({ x: 0, y: 99_999 }, BUBBLE_SIZE, DESKTOP).y).toBe(
      DESKTOP.height - BUBBLE_SIZE - EDGE_MARGIN
    );
  });
});

describe('bubbleRestPosition', () => {
  it('defaults to the bottom-right, and stacks slots upward without overlap', () => {
    const first = bubbleRestPosition(null, DESKTOP, 0);
    const second = bubbleRestPosition(null, DESKTOP, 1);

    expect(first.x).toBe(DESKTOP.width - BUBBLE_SIZE - EDGE_MARGIN);
    expect(second.x).toBe(first.x);
    expect(first.y - second.y).toBeGreaterThanOrEqual(BUBBLE_SIZE);
  });

  // A spot remembered on a 2560px screen is mid-canvas on a 1440px one. Re-snapping
  // x to the CURRENT viewport is what stops a bubble stranding in the middle.
  it('re-docks a remembered position to the current viewport, keeping the side', () => {
    const remembered = { x: 2500, y: 300 };
    const rest = bubbleRestPosition(remembered, DESKTOP);

    expect(rest.x).toBe(DESKTOP.width - BUBBLE_SIZE - EDGE_MARGIN);
    expect(rest.y).toBe(300);
  });

  it('keeps a left-docked bubble on the left', () => {
    expect(bubbleRestPosition({ x: 12, y: 200 }, DESKTOP).x).toBe(EDGE_MARGIN);
  });

  it('ignores a half-written remembered position', () => {
    const rest = bubbleRestPosition({ x: 500 }, DESKTOP);
    expect(rest).toEqual(bubbleRestPosition(null, DESKTOP));
  });
});

describe('clampWindow', () => {
  it('leaves a window that already fits alone', () => {
    const fits = { x: 100, y: 100, width: 800, height: 600 };
    expect(clampWindow(fits, DESKTOP)).toEqual(fits);
  });

  // The state a user cannot recover from without clearing storage: the header, and
  // therefore the only drag handle, dragged off the bottom of the screen.
  it('always leaves the header on screen', () => {
    const offBottom = { x: 0, y: 99_999, width: 800, height: 600 };
    expect(clampWindow(offBottom, DESKTOP).y).toBe(DESKTOP.height - HEADER_VISIBLE);
  });

  it('shrinks a window wider than the viewport, then positions it', () => {
    const tiny = { width: 400, height: 300 };
    const huge = { x: 0, y: 0, width: 2000, height: 2000 };
    const fitted = clampWindow(huge, tiny);

    expect(fitted.width).toBe(tiny.width);
    expect(fitted.height).toBe(tiny.height);
    expect(fitted.x).toBe(0);
  });

  it('never goes below the minimum size', () => {
    const fitted = clampWindow({ x: 0, y: 0, width: 10, height: 10 }, DESKTOP);
    expect(fitted.width).toBe(MIN_WIDTH);
    expect(fitted.height).toBe(MIN_HEIGHT);
  });

  // Size is clamped before position for a reason: against an unclamped 2000px width
  // the maximum x is 1440 - 2000 = -560, and clamping to a negative maximum puts the
  // window off the left edge.
  it('keeps x at 0 rather than negative on a viewport narrower than the window', () => {
    expect(clampWindow({ x: 500, y: 0, width: 2000, height: 600 }, DESKTOP).x).toBe(0);
  });
});

describe('centredGeometry', () => {
  it('centres a window on a desktop viewport', () => {
    const geometry = centredGeometry(DESKTOP);
    const centreOffset = Math.abs(geometry.x - (DESKTOP.width - geometry.width) / 2);
    expect(centreOffset).toBeLessThan(1);
    expect(geometry.width).toBe(900);
  });

  it('fits inside a phone-sized viewport instead of overflowing it', () => {
    const phone = { width: 390, height: 844 };
    const geometry = centredGeometry(phone);

    expect(geometry.width).toBeLessThanOrEqual(Math.max(MIN_WIDTH, phone.width));
    expect(geometry.x).toBeGreaterThanOrEqual(0);
    expect(geometry.y).toBeGreaterThanOrEqual(0);
  });
});
