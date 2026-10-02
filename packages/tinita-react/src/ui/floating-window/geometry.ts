/**
 * Pure geometry for the floating window. No DOM, no React - so every rule below is
 * unit-testable without a renderer, which is why it lives in its own module.
 *
 * Everything here **clamps**; nothing throws. That is deliberate and it follows the
 * precedent already set by `usePagination`: a window dragged past the edge of the
 * screen, or a viewport that shrank under it, is ordinary use and not a caller error.
 * A throw here would crash a render over a mouse movement.
 */

/** Side of the viewport a minimized bubble docks to. */
export type SnapSide = 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

export interface WindowGeometry extends Point {
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

/** Diameter of the minimized bubble, in px. Mirrored by `--tnt-fw-bubble-size`. */
export const BUBBLE_SIZE = 48;

/** Gap kept between the bubble and the viewport edge it docks to. */
export const EDGE_MARGIN = 12;

/** Smallest window a resize will produce. */
export const MIN_WIDTH = 320;
export const MIN_HEIGHT = 240;

/**
 * Strip of the window that must stay on screen vertically.
 *
 * Matches the header height, so a window can never be dragged down past the point
 * where its own drag handle is unreachable - the state a user cannot recover from
 * without clearing storage.
 */
export const HEADER_VISIBLE = 40;

/** Vertical gap between stacked default bubble positions, so they do not overlap. */
const BUBBLE_STACK_GAP = 8;

/** Distance a default bubble sits above the bottom edge. */
const BUBBLE_BOTTOM_OFFSET = 60;

/**
 * `min`/`max` applied in an order that survives an inverted range.
 *
 * When `max < min` - a viewport narrower than `MIN_WIDTH`, which a phone in landscape
 * really does produce - `Math.min(Math.max(v, min), max)` returns `max`, keeping the
 * value inside the viewport. Writing it the other way round returns `min` and pushes
 * the window off-screen instead. `NaN` falls through to `min`, which is a position on
 * screen rather than a window that vanishes.
 */
export function clamp(value: number, min: number, max: number): number {
  // assert-reuse-ignore hợp đồng của clamp là TRẢ VỀ một số trong khoảng, không ném.
  // Dùng assertFiniteNumber ở đây sẽ làm một cú di chuột làm sập render. Cùng lý do
  // với usePagination - xem docs/code-standards.md mục exemption.
  if (!Number.isFinite(value)) return min;

  return Math.min(Math.max(value, min), max);
}

/** Which half of the viewport the bubble's centre is in. */
export function snapSideFor(x: number, size: number, viewportWidth: number): SnapSide {
  return x + size / 2 < viewportWidth / 2 ? 'left' : 'right';
}

/**
 * Nearest edge for a bubble released at `point`, keeping its vertical position.
 *
 * X goes hard to one edge; Y is preserved and clamped. That is the whole interaction:
 * the user chooses the height, the component chooses the side.
 */
export function snapToEdge(
  point: Point,
  size: number,
  viewport: Viewport
): { x: number; y: number; side: SnapSide } {
  const side = snapSideFor(point.x, size, viewport.width);

  return {
    x: side === 'left' ? EDGE_MARGIN : viewport.width - size - EDGE_MARGIN,
    y: clamp(point.y, EDGE_MARGIN, viewport.height - size - EDGE_MARGIN),
    side,
  };
}

/**
 * Where a minimized bubble rests: its remembered snap position when it has one, else
 * a slot-stacked default in the bottom-right.
 *
 * X is re-snapped to the nearest edge of the CURRENT viewport, preserving the side.
 * A position remembered on a wider screen would otherwise sit stranded mid-canvas.
 * Y is preserved and clamped, because the user picked it.
 *
 * Used by BOTH the bubble's resting place and the window's collapse target, so the
 * two always agree - they diverged in the version this replaces, where the window
 * shrank toward one spot and the bubble appeared at another.
 */
export function bubbleRestPosition(
  remembered: Partial<Point> | null | undefined,
  viewport: Viewport,
  slot = 0
): Point {
  const raw =
    remembered && remembered.x != null && remembered.y != null
      ? { x: remembered.x, y: remembered.y }
      : {
          x: viewport.width - BUBBLE_SIZE - EDGE_MARGIN,
          y:
            viewport.height -
            BUBBLE_SIZE -
            EDGE_MARGIN -
            BUBBLE_BOTTOM_OFFSET -
            slot * (BUBBLE_SIZE + BUBBLE_STACK_GAP),
        };

  const { x, y } = snapToEdge(raw, BUBBLE_SIZE, viewport);

  return { x, y };
}

/**
 * A window geometry forced back inside `viewport`.
 *
 * Size first, then position: clamping position against an unclamped size lets a
 * window wider than the viewport report a negative maximum for X.
 */
export function clampWindow(geometry: WindowGeometry, viewport: Viewport): WindowGeometry {
  const width = clamp(geometry.width, MIN_WIDTH, Math.max(MIN_WIDTH, viewport.width));
  const height = clamp(geometry.height, MIN_HEIGHT, Math.max(MIN_HEIGHT, viewport.height));

  return {
    width,
    height,
    x: clamp(geometry.x, 0, Math.max(0, viewport.width - width)),
    y: clamp(geometry.y, 0, Math.max(0, viewport.height - HEADER_VISIBLE)),
  };
}

/** A centred window of `width` x `height`, shrunk to fit a small viewport. */
export function centredGeometry(viewport: Viewport, width = 900, height = 600): WindowGeometry {
  const w = Math.min(width, Math.max(MIN_WIDTH, viewport.width - 80));
  const h = Math.min(height, Math.max(MIN_HEIGHT, viewport.height - 120));

  return clampWindow(
    { width: w, height: h, x: (viewport.width - w) / 2, y: (viewport.height - h) / 2 },
    viewport
  );
}
