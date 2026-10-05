'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  clampWindow,
  MIN_HEIGHT,
  MIN_WIDTH,
  type Viewport,
  type WindowGeometry,
} from '../ui/floating-window/geometry';

// Re-exported for the same reason as in `useDragSnap`: this hook's own signature
// speaks in these types, and `geometry` is not a published subpath.
export type { Viewport, WindowGeometry } from '../ui/floating-window/geometry';
export { MIN_HEIGHT, MIN_WIDTH } from '../ui/floating-window/geometry';

export interface WindowDragOptions {
  geometry: WindowGeometry;
  viewport: Viewport;
  /** Committed once per gesture, on release - never on every pointer move. */
  onGeometryChange: (geometry: WindowGeometry) => void;
  /** Raise this window. Fired on pointer-down, before the gesture begins. */
  onFocus?: () => void;
}

export interface WindowDragResult {
  /** Live geometry: follows the pointer during a gesture, else `geometry`. */
  box: WindowGeometry;
  /** True during a drag or resize. The body is shielded while it is. */
  interacting: boolean;
  onHeaderPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onResizePointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}

/**
 * Move and resize a window with the pointer.
 *
 * Geometry is local while a gesture runs, for frame-rate feedback, and is committed
 * to the caller exactly once on release. Committing on every move would hand the
 * consumer sixty state updates a second, and if they persist it, sixty writes to
 * storage per drag.
 *
 * `onPointerMove` / `onPointerUp` belong on the window's OUTER element, not on the
 * header. Pointer capture is taken by whichever element starts the gesture, so the
 * events keep arriving at the outer container even when the pointer travels across
 * an iframe in the body - which is the case the `interacting` shield exists for.
 */
export function useWindowDrag({
  geometry,
  viewport,
  onGeometryChange,
  onFocus,
}: WindowDragOptions): WindowDragResult {
  const [box, setBox] = useState<WindowGeometry>(geometry);
  const [interacting, setInteracting] = useState(false);

  // 'drag' | 'resize' | null. A ref, not state: the move handler must read the
  // current mode without a stale closure, and a mode change must not re-render.
  const mode = useRef<null | 'drag' | 'resize'>(null);
  const start = useRef({ pointerX: 0, pointerY: 0, box: geometry });

  // Live mirror, committed on release. Reading `box` from the render closure can
  // miss the final move: React need not have re-rendered before `pointerup` fires.
  const live = useRef<WindowGeometry>(geometry);

  // Pull external geometry changes in - a restore after maximize, or a viewport that
  // shrank - but ONLY between gestures, so an incoming update never fights a live
  // drag. Without the guard, a parent re-render mid-drag snaps the window back.
  useEffect(() => {
    if (mode.current) return;
    live.current = geometry;
    setBox(geometry);
  }, [geometry]);

  const begin = useCallback(
    (kind: 'drag' | 'resize', event: ReactPointerEvent<HTMLElement>) => {
      // Optional call, not a bare one. Pointer capture is what keeps move events
      // arriving while the pointer travels over an iframe, but jsdom does not
      // implement `setPointerCapture` at all - measured 2026-10-02:
      // `typeof el.setPointerCapture === 'undefined'`. A bare call throws
      // `TypeError` inside the pointerdown handler, so the gesture never starts and
      // the component looks inert in any jsdom-based test, the consumer's included.
      event.currentTarget.setPointerCapture?.(event.pointerId);
      mode.current = kind;
      setInteracting(true);
      onFocus?.();
      // Pointer position and geometry captured together, so the delta below is
      // always measured against the same instant.
      start.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        box: live.current,
      };
      event.preventDefault();
    },
    [onFocus]
  );

  const onHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => begin('drag', event),
    [begin]
  );

  const onResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // The header's drag handler sits on an ancestor; without this both fire and
      // the window moves while it resizes.
      event.stopPropagation();
      begin('resize', event);
    },
    [begin]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!mode.current) return;

      const dx = event.clientX - start.current.pointerX;
      const dy = event.clientY - start.current.pointerY;
      const from = start.current.box;

      const next =
        mode.current === 'drag'
          ? clampWindow({ ...from, x: from.x + dx, y: from.y + dy }, viewport)
          : clampWindow(
              {
                ...from,
                width: Math.max(MIN_WIDTH, from.width + dx),
                height: Math.max(MIN_HEIGHT, from.height + dy),
              },
              viewport
            );

      live.current = next;
      setBox(next);
    },
    [viewport]
  );

  const onPointerUp = useCallback(() => {
    if (!mode.current) return;
    mode.current = null;
    setInteracting(false);
    onGeometryChange(live.current);
  }, [onGeometryChange]);

  // Gesture aborted, so nothing is committed. Resetting `interacting` matters more
  // than it looks: the body shield is driven by it, and a stuck `true` leaves an
  // iframe permanently click-through.
  const onPointerCancel = useCallback(() => {
    if (!mode.current) return;
    mode.current = null;
    setInteracting(false);
    live.current = geometry;
    setBox(geometry);
  }, [geometry]);

  return {
    box,
    interacting,
    onHeaderPointerDown,
    onResizePointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
