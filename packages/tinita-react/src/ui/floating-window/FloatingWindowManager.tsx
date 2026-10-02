import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { useFloatingWindowStore } from './stores/floatingWindowStore';
import { FloatingWindow } from './FloatingWindow';
import { FloatingBubble } from './FloatingBubble';

/**
 * Renders all open floating windows (and minimized bubbles) into document.body
 * via a React portal so they sit above the app's layout stacking context.
 *
 * Windows stay MOUNTED for their whole open lifetime (iframe state survives
 * minimize/restore — no reload); their AnimatePresence only animates OPEN/CLOSE.
 * A minimized window animates itself down to the bubble spot and hides, while a
 * FloatingBubble mounts on top (its own AnimatePresence handles minimize/restore).
 *
 * Phase 04 mounts this once in __root.tsx.
 */
export function FloatingWindowManager() {
  const windows = useFloatingWindowStore((s) => s.windows);

  // Only entries that are open AND have runtime meta (meta is stripped on persist).
  const entries = Object.entries(windows).filter(([, w]) => w.isOpen && w.meta);

  // Stable per-id slot so a window and its bubble agree on the default bubble spot
  // (and multiple default bubbles stack instead of overlapping).
  const slotOf = new Map(entries.map(([id], i) => [id, i]));

  // Stacking rank: the raw `order` counter grows unbounded, so mapping it straight
  // to z-index quickly saturates the small z range (all windows clamp to the same
  // top value → focus stops raising anything). Instead rank windows by `order` and
  // hand each a compact 0-based stack index; z-index is derived from that. The
  // last-focused window ends up with the highest rank (and is the active one).
  const ranked = [...entries].sort((a, b) => a[1].order - b[1].order);
  const rankOf = new Map(ranked.map(([id], i) => [id, i]));
  // Active = highest-order window that is actually visible (skip minimized ones).
  let activeId: string | null = null;
  for (let i = ranked.length - 1; i >= 0; i--) {
    if (!ranked[i][1].isMinimized) {
      activeId = ranked[i][0];
      break;
    }
  }

  return createPortal(
    <>
      {/* Windows — mounted while open; AnimatePresence gives the close exit animation. */}
      <AnimatePresence>
        {entries.map(([id, w]) => (
          <FloatingWindow
            key={id}
            id={id}
            win={w}
            slot={slotOf.get(id) ?? 0}
            stack={rankOf.get(id) ?? 0}
            isActive={id === activeId}
          />
        ))}
      </AnimatePresence>

      {/* Bubbles — only while minimized; AnimatePresence gives minimize/restore pop. */}
      <AnimatePresence>
        {entries
          .filter(([, w]) => w.isMinimized)
          .map(([id, w]) => (
            <FloatingBubble key={id} id={id} win={w} slot={slotOf.get(id) ?? 0} />
          ))}
      </AnimatePresence>
    </>,
    document.body,
  );
}
