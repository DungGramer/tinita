'use client';

import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  BUBBLE_SIZE,
  snapToEdge,
  type Point,
  type SnapSide,
  type Viewport,
} from '../ui/floating-window/geometry';

// Re-exported so a consumer of this subpath has the types its own signature uses
// without a second import. `geometry` itself is not a published subpath - see the note
// at the top of that file.
export type { Point, SnapSide, Viewport } from '../ui/floating-window/geometry';
export { BUBBLE_SIZE, EDGE_MARGIN } from '../ui/floating-window/geometry';

/** Pointer travel, in px, past which the gesture is a drag rather than a tap. */
const TAP_SLOP = 5;

export interface DragSnapOptions {
  /** Current viewport. `{ width: 0, height: 0 }` before mount - see `useWindowSize`. */
  viewport: Viewport;
  /** Where the bubble should rest. Owned by the caller so it can be remembered. */
  position: Point;
  /** Called with the snapped position when a drag ends. */
  onSnap: (position: Point, side: SnapSide) => void;
  /** Called when the gesture turned out to be a tap, not a drag. */
  onTap: () => void;
  size?: number;
}

export interface DragSnapResult {
  /** Position to render at: the live pointer position mid-drag, else `position`. */
  rendered: Point;
  /** True while a pointer is down and has moved past the slop. */
  dragging: boolean;
  handlers: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
  };
}

/**
 * Drag a small square and snap it to the nearest viewport edge on release.
 *
 * Fully controlled: the caller owns `position`, so it decides whether the spot is
 * remembered and where. This hook holds only the live gesture.
 *
 * **Reads no `window`.** The viewport arrives as a prop, which is what makes the
 * component render on a server. The hook it replaces read `window.innerWidth` in its
 * own body to seed a position - the same defect `useWindowSize` was rewritten to fix,
 * where `window` in a `useState` initialiser throws rather than mismatching.
 *
 * **Animates in CSS, not JavaScript.** The snap target is handed back through
 * `onSnap` and the element transitions to it, so `prefers-reduced-motion` can switch
 * it off in the stylesheet. The version this replaces animated with framer-motion
 * springs, which no media query can reach.
 *
 * A gesture that never travels `TAP_SLOP` px is a tap: `onTap` fires and no snap
 * happens. Without the distinction, every attempt to reposition the bubble also
 * triggered whatever the tap does.
 */
export function useDragSnap({
  viewport,
  position,
  onSnap,
  onTap,
  size = BUBBLE_SIZE,
}: DragSnapOptions): DragSnapResult {
  // Live pointer position, null unless a drag is in progress.
  //
  // BOTH a ref and state, for two different readers. The element has to re-render as
  // it follows the pointer, which needs state; `onPointerUp` has to commit the final
  // position, which must NOT come from state - `pointermove` is a continuous event so
  // React may defer its flush, and `pointerup` then reads the value from before the
  // last move. Measured 2026-10-02: reading state alone, a bubble dragged from x=980
  // to x=60 committed the ORIGINAL 964px, because `live` was still null at release.
  // `useWindowDrag` keeps the same pair for the same reason.
  const liveRef = useRef<Point | null>(null);
  const [live, setLive] = useState<Point | null>(null);

  const setLivePosition = useCallback((next: Point | null) => {
    liveRef.current = next;
    setLive(next);
  }, []);

  // Gesture bookkeeping that must NOT trigger renders, and must be readable from the
  // move handler without a stale closure.
  const active = useRef(false);
  const moved = useRef(false);
  const origin = useRef<Point>({ x: 0, y: 0 });
  const grab = useRef<Point>({ x: 0, y: 0 });

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // Optional call, not a bare one. Pointer capture is what keeps move events
      // arriving while the pointer travels over an iframe, but jsdom does not
      // implement `setPointerCapture` at all - measured 2026-10-02:
      // `typeof el.setPointerCapture === 'undefined'`. A bare call throws
      // `TypeError` inside the pointerdown handler, so the gesture never starts and
      // the component looks inert in any jsdom-based test, the consumer's included.
      event.currentTarget.setPointerCapture?.(event.pointerId);
      active.current = true;
      moved.current = false;
      origin.current = { x: event.clientX, y: event.clientY };
      grab.current = {
        x: event.clientX - position.x,
        y: event.clientY - position.y,
      };
      // Stops the drag from selecting text across the page.
      event.preventDefault();
    },
    [position.x, position.y]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!active.current) return;

      if (!moved.current) {
        const travelled =
          Math.abs(event.clientX - origin.current.x) > TAP_SLOP ||
          Math.abs(event.clientY - origin.current.y) > TAP_SLOP;
        if (!travelled) return;
        moved.current = true;
      }

      setLivePosition({
        x: event.clientX - grab.current.x,
        y: event.clientY - grab.current.y,
      });
    },
    [setLivePosition]
  );

  const onPointerUp = useCallback(() => {
    if (!active.current) return;
    active.current = false;

    if (!moved.current) {
      onTap();
      return;
    }

    const from = liveRef.current ?? position;
    const snapped = snapToEdge(from, size, viewport);
    setLivePosition(null);
    onSnap({ x: snapped.x, y: snapped.y }, snapped.side);
  }, [position, size, viewport, onSnap, onTap, setLivePosition]);

  // Pointer cancelled - touch interrupted, an OS gesture took over, a right-click
  // mid-drag. `pointerup` will not arrive, so without this the next tap reads as a
  // stuck drag. The gesture aborted, so nothing snaps and nothing is committed.
  const onPointerCancel = useCallback(() => {
    active.current = false;
    moved.current = false;
    setLivePosition(null);
  }, [setLivePosition]);

  return {
    rendered: live ?? position,
    dragging: live !== null,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
