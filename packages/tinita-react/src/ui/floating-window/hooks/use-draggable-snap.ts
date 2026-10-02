import { useRef, useState, useEffect } from 'react';
import { useMotionValue, animate } from 'framer-motion';

export type SnapSide = 'left' | 'right';

// FAB width / height in px — MUST match the caller's BTN so the
// right-edge snap (vw - BTN - MARGIN) leaves the same MARGIN gap as the left edge
const MARGIN = 12; // min distance from screen edges

/**
 * Draggable FAB that snaps to the nearest left/right edge on release,
 * keeping the vertical position (clamped to screen bounds).
 *
 * Returns framer-motion values for x/y so the parent can drive a motion.div,
 * plus pointer-event handlers to attach to the button element.
 *
 * onPointerUp returns `true` when the interaction was a tap (no movement),
 * so the caller can toggle open/close.
 *
 * @param size - FAB diameter in px (default 60, matches ChatBubble)
 * @param initial - optional starting position (e.g. a persisted snap spot). When
 *   omitted, seeds bottom-right. Read once at mount; later changes are ignored.
 * @param onSnap - optional callback fired with the snapped position/side on every
 *   edge-snap (drag release + resize re-snap), so callers can persist it.
 */
export function useDraggableSnap(
  size: number = 60,
  initial?: { x: number; y: number },
  onSnap?: (pos: { x: number; y: number }, side: SnapSide) => void
) {
  const BTN = size; // was module-level `const BTN = 60` — now param-driven
  // Seed from the persisted position when provided (clamped to the viewport),
  // else default to the bottom-right corner.
  const initX = initial
    ? Math.max(MARGIN, Math.min(initial.x, window.innerWidth - BTN - MARGIN))
    : window.innerWidth - BTN - MARGIN;
  const initY = initial
    ? Math.max(MARGIN, Math.min(initial.y, window.innerHeight - BTN - MARGIN))
    : window.innerHeight - BTN - MARGIN - 60;

  const x = useMotionValue(initX);
  const y = useMotionValue(initY);

  // Keep the latest onSnap in a ref so the resize effect's deps stay stable
  // (callers may pass a fresh inline callback each render).
  const onSnapRef = useRef(onSnap);
  onSnapRef.current = onSnap;

  // Track which side the button is docked to so the panel opens toward the centre
  const [snapSide, setSnapSide] = useState<SnapSide>('right');
  // Mirror position as plain state so renders can read it without subscribing to motion values
  const [buttonPos, setButtonPos] = useState({ x: initX, y: initY });

  // Re-snap on viewport resize / orientation change so the button stays on its edge
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function handleResize() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const cx = x.get();
        const cy = y.get();
        const isLeft = cx + BTN / 2 < vw / 2;
        const targetX = isLeft ? MARGIN : vw - BTN - MARGIN;
        const targetY = Math.max(MARGIN, Math.min(cy, vh - BTN - MARGIN));
        animate(x, targetX, { type: 'spring', stiffness: 400, damping: 30 });
        animate(y, targetY, { type: 'spring', stiffness: 400, damping: 30 });
        setSnapSide(isLeft ? 'left' : 'right');
        setButtonPos({ x: targetX, y: targetY });
        onSnapRef.current?.({ x: targetX, y: targetY }, isLeft ? 'left' : 'right');
      }, 80);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [x, y, BTN]);

  const dragging = useRef(false);
  const moved = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offset = useRef({ x: 0, y: 0 });

  function snapToEdge() {
    const cx = x.get();
    const cy = y.get();
    const isLeft = cx + BTN / 2 < window.innerWidth / 2;
    const targetX = isLeft ? MARGIN : window.innerWidth - BTN - MARGIN;
    const targetY = Math.max(MARGIN, Math.min(cy, window.innerHeight - BTN - MARGIN));

    animate(x, targetX, { type: 'spring', stiffness: 400, damping: 30 });
    animate(y, targetY, { type: 'spring', stiffness: 400, damping: 30 });

    const side: SnapSide = isLeft ? 'left' : 'right';
    setSnapSide(side);
    setButtonPos({ x: targetX, y: targetY });
    onSnapRef.current?.({ x: targetX, y: targetY }, side);
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = true;
    moved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offset.current = { x: e.clientX - x.get(), y: e.clientY - y.get() };
    e.preventDefault(); // prevent text selection during drag
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;

    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (!moved.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      moved.current = true;
    }

    if (moved.current) {
      x.set(Math.max(0, Math.min(e.clientX - offset.current.x, window.innerWidth - BTN)));
      y.set(Math.max(0, Math.min(e.clientY - offset.current.y, window.innerHeight - BTN)));
    }
  }

  /** Returns true when the interaction was a tap (not a drag), so callers can toggle. */
  function onPointerUp(): boolean {
    if (!dragging.current) return false;
    dragging.current = false;
    if (moved.current) {
      snapToEdge();
      return false;
    }
    return true;
  }

  // Pointer cancelled (touch interruption, OS gesture takeover): reset drag state
  // so the next tap isn't misread as a stuck drag. No snap — the gesture aborted.
  function onPointerCancel() {
    dragging.current = false;
    moved.current = false;
  }

  return { x, y, snapSide, buttonPos, onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
