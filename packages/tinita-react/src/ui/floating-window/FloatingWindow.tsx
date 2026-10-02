import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Minus, Maximize2, Minimize2, RefreshCw, ExternalLink, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useFloatingWindowStore,
  type WindowId,
  type FloatingWindow as FW,
} from './stores/floatingWindowStore';
import { useFloatingWindowDrag } from './use-floating-window-drag';
import { BUBBLE_SIZE, bubbleRestPosition } from './floating-window-config';

// z-45: above ChatBubble (z-40), below shadcn modals (z-50).
// Maximized window fills viewport at z-50.
const BASE_Z = 45;

// Spring for maximize/restore + minimize/expand + close transitions.
const SPRING = { type: 'spring' as const, stiffness: 380, damping: 32 };

/**
 * A single open floating window — stays MOUNTED for its whole open lifetime so the
 * embedded <iframe> keeps its state across minimize/restore (no reload).
 *
 * - Minimize does NOT unmount: the window animates (transform-scale + translate) down
 *   to the bubble spot and hides (opacity 0, pointer-events none). Because width/height
 *   stay at the visible size and only the CSS transform scales, the iframe never reflows
 *   to 48px — restore grows it back with zero layout flash.
 * - Maximize/restore animates real width/height (iframe re-layouts to fullscreen res, as
 *   wanted for a dashboard).
 * - Close is an AnimatePresence exit (fade + slight shrink), handled by the manager.
 */
export function FloatingWindow({
  id,
  win,
  slot,
  stack,
  isActive,
}: {
  id: WindowId;
  win: FW;
  slot: number;
  stack: number;
  isActive: boolean;
}) {
  const { t } = useTranslation('common');
  const reduce = useReducedMotion();

  // Local reload key — incrementing forces iframe remount (cross-origin reload workaround).
  const [reloadKey, setReloadKey] = useState(0);

  // Actions via getState() are stable references (no re-sub on each render).
  const { close, minimize, toggleMaximize, focus } = useFloatingWindowStore.getState();

  const {
    box,
    isInteracting,
    onHeaderPointerDown,
    onResizePointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  } = useFloatingWindowDrag(id, win);

  // meta is guaranteed present: the manager only renders when w.meta is set.
  const meta = win.meta!;
  const Icon = meta.icon;

  // Track viewport so maximized geometry (numeric, for smooth tweening) refits on resize.
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Keep a windowed box on-screen after the viewport shrinks (read fresh from the
  // store so deps stay minimal; the drag hook resyncs local `box` from the store).
  useEffect(() => {
    const s = useFloatingWindowStore.getState();
    const w = s.windows[id];
    if (!w || w.isMaximized) return;
    const width = Math.min(w.width, vp.w);
    const height = Math.min(w.height, vp.h);
    const x = Math.max(0, Math.min(w.x, vp.w - width));
    const y = Math.max(0, Math.min(w.y, vp.h - 40));
    if (width !== w.width || height !== w.height) s.setSize(id, width, height);
    if (x !== w.x || y !== w.y) s.setPosition(id, x, y);
  }, [vp.w, vp.h, id]);

  const maximized = win.isMaximized;
  const minimized = win.isMinimized;
  // Multi-window stacking: z = base + compact stack rank (0,1,2…) from the manager,
  // hard-capped below 50 (modal z-index). Using the rank instead of the raw, ever-
  // growing `order` keeps z from saturating so click-to-focus always raises windows.
  const z = maximized ? 50 : Math.min(BASE_Z + stack, 49);

  // Visible LAYOUT geometry (real iframe size). Maximized = full viewport.
  const visW = maximized ? vp.w : box.width;
  const visH = maximized ? vp.h : box.height;
  const visX = maximized ? 0 : box.x;
  const visY = maximized ? 0 : box.y;

  // Bubble spot (persisted/snapped or slot-offset default, clamped for corners).
  const bubbleRest = bubbleRestPosition(win, vp.w, vp.h, slot);

  // Minimize collapses via transform-scale (origin top-left) so width/height — and thus
  // the iframe layout — stay fixed (no reflow). Scaled corner lands on the bubble spot.
  const animateTo = minimized
    ? {
        x: bubbleRest.x,
        y: bubbleRest.y,
        width: visW,
        height: visH,
        scaleX: BUBBLE_SIZE / visW,
        scaleY: BUBBLE_SIZE / visH,
        opacity: 0,
        borderRadius: 12,
      }
    : {
        x: visX,
        y: visY,
        width: visW,
        height: visH,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        borderRadius: maximized ? 0 : 12,
      };

  // Reduced motion or live drag/resize → instant; otherwise spring.
  const transition = reduce || isInteracting ? { duration: 0 } : SPRING;

  return (
    <motion.div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        transformOrigin: '0 0',
        zIndex: z,
        touchAction: 'none',
        // Collapsed window is invisible + click-through so the bubble/page beneath work.
        pointerEvents: minimized ? 'none' : 'auto',
      }}
      initial={{ opacity: 0, scaleX: 0.94, scaleY: 0.94 }}
      animate={animateTo}
      exit={{ opacity: 0, scaleX: 0.92, scaleY: 0.92 }}
      transition={transition}
      // Raise to front on any pointer-down within the window chrome (capture phase
      // fires before drag/resize begin and before button handlers stop propagation).
      onPointerDownCapture={() => focus(id)}
      // Pointer handlers on the outer container so pointer capture (set on drag/resize
      // initiators) keeps delivering events here even when the pointer is over the iframe.
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={`flex flex-col overflow-hidden border bg-background transition-shadow ${
        isActive
          ? 'border-border shadow-2xl ring-1 ring-primary/30'
          : 'border-border/60 shadow-lg'
      }`}
    >
      {/* Header — drag handle in windowed mode; double-click toggles maximize. */}
      <div
        onPointerDown={maximized ? undefined : onHeaderPointerDown}
        onDoubleClick={() => toggleMaximize(id)}
        className={`flex h-10 shrink-0 items-center justify-between gap-2 border-b px-3 select-none ${
          maximized ? '' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <Icon className={`h-4 w-4 shrink-0 ${meta.iconClassName ?? ''}`} />
          <span className="truncate">{meta.title}</span>
        </div>

        {/* Control buttons: stopPropagation prevents header drag from triggering. */}
        <TooltipProvider delayDuration={300}>
          <div
            className="flex shrink-0 items-center gap-0.5"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <IconBtn label={t('window.reload')} onClick={() => setReloadKey((k) => k + 1)}>
              <RefreshCw className="h-3.5 w-3.5" />
            </IconBtn>

            <IconBtn
              label={t('window.newTab')}
              onClick={() => window.open(meta.url, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </IconBtn>

            <IconBtn label={t('window.minimize')} onClick={() => minimize(id)}>
              <Minus className="h-3.5 w-3.5" />
            </IconBtn>

            {/* Toggle label/icon based on current maximize state. */}
            <IconBtn
              label={maximized ? t('window.restore') : t('window.maximize')}
              onClick={() => toggleMaximize(id)}
            >
              {maximized ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </IconBtn>

            <IconBtn label={t('window.close')} onClick={() => close(id)}>
              <X className="h-3.5 w-3.5" />
            </IconBtn>
          </div>
        </TooltipProvider>
      </div>

      {/* Iframe container — flex-1 fills remaining height. Never remounted on minimize. */}
      <div className="relative flex-1">
        {/*
         * Pointer shield: during drag/resize the cross-origin iframe would swallow
         * pointer events, breaking the drag. pointer-events:none while interacting lets
         * the outer container's onPointerMove/Up keep receiving events via pointer capture.
         * ALSO none while minimized — the collapsed (but still-mounted) iframe overlays
         * the bubble; without this the iframe re-enables itself (pointer-events:auto beats
         * the outer div's `none`) and eats the bubble's hover/click.
         */}
        <iframe
          key={reloadKey}
          src={meta.url}
          title={meta.title}
          allow="fullscreen; clipboard-read; clipboard-write"
          className="absolute inset-0 h-full w-full border-0"
          style={{ pointerEvents: isInteracting || minimized ? 'none' : 'auto' }}
        />

        {/*
         * Focus shield: a click on the cross-origin iframe never bubbles to the parent
         * document, so it can't raise this window. While INACTIVE, a transparent
         * parent-DOM layer overlays the iframe and intercepts the first pointer-down to
         * bring the window forward; once active it unmounts, leaving the iframe fully
         * interactive. (The header/border use the outer onPointerDownCapture instead.)
         */}
        {!isActive && !minimized && !maximized && (
          <div
            className="absolute inset-0 z-20"
            onPointerDown={() => focus(id)}
            aria-hidden
          />
        )}
      </div>

      {/* Resize handle — bottom-right, windowed only. */}
      {!maximized && !minimized && (
        <div
          onPointerDown={onResizePointerDown}
          className="absolute right-0 bottom-0 z-10 h-4 w-4 cursor-nwse-resize"
          aria-hidden
        />
      )}
    </motion.div>
  );
}

// Icon button with a shadcn tooltip (matches the rest of the app; keeps aria-label).
function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          aria-label={label}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
