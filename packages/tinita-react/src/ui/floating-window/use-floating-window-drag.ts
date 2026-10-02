import { useRef, useState, useEffect } from 'react';
import { useFloatingWindowStore, type WindowId } from './stores/floatingWindowStore';

const MIN_W = 320;
const MIN_H = 240;

interface WinGeom {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Free-position drag + bottom-right resize for a windowed floating box.
 *
 * Pointer capture on the interacting element keeps tracking even when the
 * pointer moves over the iframe — combined with the pointer shield
 * (`isInteracting` → iframe pointer-events:none) this prevents the iframe
 * from swallowing events during drag/resize.
 *
 * Geometry is driven by local state for smooth live feedback; it is committed
 * to the store ONLY on pointer-up to avoid thrashing localStorage on every move.
 *
 * The guarded useEffect re-syncs local `box` from the store when geometry
 * changes externally (e.g. maximize→restore resets x/y/width/height) but
 * ONLY when no interaction is in progress (`!mode.current`), so live drag is
 * never interrupted by a store update racing in.
 */
export function useFloatingWindowDrag(id: WindowId, win: WinGeom) {
  const setPosition = useFloatingWindowStore((s) => s.setPosition);
  const setSize = useFloatingWindowStore((s) => s.setSize);
  const focus = useFloatingWindowStore((s) => s.focus);

  // Local live geometry — seeded from store; committed back on pointer-up.
  const [box, setBox] = useState<WinGeom>(win);
  const [isInteracting, setInteracting] = useState(false);

  // 'drag' | 'resize' | null — ref (not state) so move handler reads it without
  // a stale closure and without triggering re-renders on every pointer event.
  const mode = useRef<null | 'drag' | 'resize'>(null);
  const start = useRef({ px: 0, py: 0, x: 0, y: 0, w: 0, h: 0 });
  // Live geometry mirror in a ref — committed to the store on pointer-up. Avoids
  // reading a stale `box` from the render closure (React may not have re-rendered
  // for the final move before pointer-up fires).
  const liveBox = useRef<WinGeom>(win);

  // Guarded resync: when the store geometry changes externally (e.g. restore
  // resets the windowed position after toggling maximize), pull it into local
  // state — but only when NOT mid-interaction, so we never clobber a live drag.
  useEffect(() => {
    if (mode.current) return;
    const next = { x: win.x, y: win.y, width: win.width, height: win.height };
    liveBox.current = next;
    setBox(next);
  }, [win.x, win.y, win.width, win.height]);

  function begin(kind: 'drag' | 'resize', e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    mode.current = kind;
    setInteracting(true);
    focus(id);
    // Capture pointer position and current geometry atomically.
    start.current = {
      px: e.clientX,
      py: e.clientY,
      x: box.x,
      y: box.y,
      w: box.width,
      h: box.height,
    };
    liveBox.current = { x: box.x, y: box.y, width: box.width, height: box.height };
    e.preventDefault();
  }

  function onHeaderPointerDown(e: React.PointerEvent) {
    begin('drag', e);
  }

  function onResizePointerDown(e: React.PointerEvent) {
    // Stop propagation so the header drag handler on the outer div doesn't also fire.
    e.stopPropagation();
    begin('resize', e);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!mode.current) return;
    const dx = e.clientX - start.current.px;
    const dy = e.clientY - start.current.py;
    if (mode.current === 'drag') {
      // Clamp: keep at least a 40 px strip of the header visible.
      const x = Math.max(0, Math.min(start.current.x + dx, window.innerWidth - box.width));
      const y = Math.max(0, Math.min(start.current.y + dy, window.innerHeight - 40));
      liveBox.current = { ...liveBox.current, x, y };
      setBox((b) => ({ ...b, x, y }));
    } else {
      const width = Math.max(MIN_W, Math.min(start.current.w + dx, window.innerWidth - box.x));
      const height = Math.max(MIN_H, Math.min(start.current.h + dy, window.innerHeight - box.y));
      liveBox.current = { ...liveBox.current, width, height };
      setBox((b) => ({ ...b, width, height }));
    }
  }

  function onPointerUp() {
    if (!mode.current) return;
    // Commit final geometry from the live ref (not the possibly-stale render closure).
    if (mode.current === 'drag') setPosition(id, liveBox.current.x, liveBox.current.y);
    else setSize(id, liveBox.current.width, liveBox.current.height);
    mode.current = null;
    setInteracting(false);
  }

  // Pointer cancelled (right-click mid-drag, touch interruption, OS takeover):
  // pointerup won't fire, so reset interaction here or the iframe stays locked
  // under the pointer shield (pointer-events:none) forever. Don't commit — the
  // gesture was aborted; the guarded resync effect restores box from the store.
  function onPointerCancel() {
    if (!mode.current) return;
    mode.current = null;
    setInteracting(false);
  }

  return {
    box,
    isInteracting,
    onHeaderPointerDown,
    onResizePointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
