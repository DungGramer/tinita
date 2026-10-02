import type { FloatingWindow } from './stores/floatingWindowStore';

// Minimized bubble geometry. MUST stay in sync with useDraggableSnap's MARGIN and
// the default init offset (initY = innerHeight - size - MARGIN - 60), so the window's
// "shrink into bubble" exit lands exactly where the bubble will rest.
export const BUBBLE_SIZE = 48;
export const BUBBLE_MARGIN = 12;
const DEFAULT_BOTTOM_OFFSET = 60;
const BUBBLE_STACK_GAP = 8; // vertical gap so multiple default bubbles don't overlap

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

/**
 * Resting position of a never-moved bubble (mirrors useDraggableSnap init for
 * BUBBLE_SIZE). `slot` stacks multiple default bubbles upward so they never overlap.
 */
function defaultBubblePosition(vpW: number, vpH: number, slot: number) {
  return {
    x: vpW - BUBBLE_SIZE - BUBBLE_MARGIN,
    y: vpH - BUBBLE_SIZE - BUBBLE_MARGIN - DEFAULT_BOTTOM_OFFSET - slot * (BUBBLE_SIZE + BUBBLE_STACK_GAP),
  };
}

/**
 * Where the minimized bubble for `win` actually sits: its persisted snapped
 * position when it has one, else the slot-stacked default.
 *
 * X is re-snapped to the nearest edge for the CURRENT viewport (preserving the
 * docked side), so a position persisted at an old/smaller viewport re-docks to the
 * correct edge instead of sticking mid-screen. Y is preserved (clamped). Used by
 * BOTH the bubble (mount position) and the window (collapse target) so they agree.
 */
export function bubbleRestPosition(
  win: Pick<FloatingWindow, 'bubbleX' | 'bubbleY'>,
  vpW: number,
  vpH: number,
  slot = 0
) {
  const raw =
    win.bubbleX != null && win.bubbleY != null
      ? { x: win.bubbleX, y: win.bubbleY }
      : defaultBubblePosition(vpW, vpH, slot);
  // Dock to whichever half the bubble is in, at the current edge.
  const dockedLeft = raw.x + BUBBLE_SIZE / 2 < vpW / 2;
  return {
    x: dockedLeft ? BUBBLE_MARGIN : vpW - BUBBLE_SIZE - BUBBLE_MARGIN,
    y: clamp(raw.y, BUBBLE_MARGIN, vpH - BUBBLE_SIZE - BUBBLE_MARGIN),
  };
}
