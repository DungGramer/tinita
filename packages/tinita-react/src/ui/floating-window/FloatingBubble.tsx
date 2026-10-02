import { motion, useReducedMotion } from 'framer-motion';
import { useFloatingWindowStore, type WindowId, type FloatingWindow as FW } from './stores/floatingWindowStore';
import { useDraggableSnap } from './hooks/use-draggable-snap';
import { cn } from '@/lib/utils';
import { BUBBLE_SIZE as BUBBLE, bubbleRestPosition } from './floating-window-config';

/**
 * Minimized state: an edge-snapping FAB representing one open window.
 * REUSES the shared useDraggableSnap hook (no duplicate drag logic).
 * Tap (no movement) → restore(id). Its resting spot is the same one the window's
 * collapse animation targets (persisted snap position, or a slot-stacked default).
 */
export function FloatingBubble({ id, win, slot }: { id: WindowId; win: FW; slot: number }) {
  const restore = useFloatingWindowStore((s) => s.restore);
  const setBubblePosition = useFloatingWindowStore((s) => s.setBubblePosition);
  const reduce = useReducedMotion();

  // Seed from the persisted snap spot (or the slot-stacked default) so re-minimizing
  // keeps position and multiple bubbles never overlap; persist on every snap.
  const initial = bubbleRestPosition(win, window.innerWidth, window.innerHeight, slot);
  const { x, y, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } = useDraggableSnap(
    BUBBLE,
    initial,
    (pos) => setBubblePosition(id, pos.x, pos.y)
  );

  const Icon = win.meta!.icon;

  function handlePointerUp() {
    // onPointerUp returns true on a tap (no drag movement occurred).
    const wasTap = onPointerUp();
    if (wasTap) restore(id);
  }

  return (
    <motion.button
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        x,
        y,
        width: BUBBLE,
        height: BUBBLE,
        zIndex: 45,
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={onPointerCancel}
      // Enter (minimize): pop in. Exit (restore): shrink out. x/y stay driven by the
      // snap hook's motion values above; scale/opacity are animated independently.
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      title={win.meta!.title}
      aria-label={win.meta!.title}
      className="flex items-center justify-center rounded-full border bg-background shadow-lg"
    >
      <Icon className={cn('h-5 w-5', win.meta!.iconClassName)} />
    </motion.button>
  );
}
