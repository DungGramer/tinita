'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useDragSnap } from '../../hooks/useDragSnap';
import { useWindowDrag } from '../../hooks/useWindowDrag';
import { useWindowSize } from '../../hooks/useWindowSize';
import { cn } from '../../utils/cn';
import { variantAttributes } from '../../utils/variantAttributes';
import {
  BUBBLE_SIZE,
  bubbleRestPosition,
  centredGeometry,
  clampWindow,
  type Point,
  type WindowGeometry,
} from './geometry';
import { CloseIcon, MaximizeIcon, MinimizeIcon, RestoreIcon, WindowIcon } from './icons';
import styles from './FloatingWindow.module.css';
import {
  formatKeyCombination,
  isApplePlatform,
  pickForPlatform,
  toAriaKeyShortcuts,
} from './formatKeyCombination';
import {
  parseBindings,
  useKeyBindings,
  type FloatingWindowAction,
  type FloatingWindowKeyBindings,
} from './useKeyBindings';

export type { Point, SnapSide, WindowGeometry } from './geometry';
export type { FloatingWindowAction, FloatingWindowKeyBindings } from './useKeyBindings';
export { BUBBLE_SIZE, MIN_HEIGHT, MIN_WIDTH } from './geometry';

/** Windowed, filling the viewport, or collapsed to an edge bubble. */
export type FloatingWindowMode = 'windowed' | 'maximized' | 'minimized';

export interface FloatingWindowLabels {
  minimize: string;
  maximize: string;
  restore: string;
  close: string;
}

/**
 * English, because a default has to be in some language and the package ships no
 * translation layer. Override through `labels` - the version this replaces called
 * `react-i18next` directly, which forced every consumer onto one i18n framework to
 * use a window.
 */
const DEFAULT_LABELS: FloatingWindowLabels = {
  minimize: 'Minimize',
  maximize: 'Maximize',
  restore: 'Restore',
  close: 'Close',
};

/**
 * Stable stand-in while the viewport is still unmeasured.
 *
 * Must be a module constant, not an inline literal. `useWindowDrag` syncs from
 * `geometry` in an effect keyed on its identity, so a fresh object every render
 * re-ran the effect, which set state, which rendered again - an infinite loop on the
 * first render, before any geometry exists.
 */
const EMPTY_GEOMETRY: WindowGeometry = { x: 0, y: 0, width: 0, height: 0 };

/** Highest z-index the window will take. Stays below the 50 most modals use. */
const Z_CEILING = 49;
const Z_BASE = 45;

export interface FloatingWindowProps {
  /** Mounted and visible while true. Nothing renders when false. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Header text. Also the bubble's accessible name, so prefer a plain string. */
  title: string;
  /** The window body. An `<iframe>` is a valid child - see the notes on shielding. */
  children: ReactNode;
  /** Icon in the header and in the collapsed bubble. */
  icon?: ReactNode;
  /** Controlled mode. Managed internally when omitted. */
  mode?: FloatingWindowMode;
  onModeChange?: (mode: FloatingWindowMode) => void;
  /**
   * Controlled geometry, in CSS pixels. Managed internally when omitted; pass it to
   * remember size and position across reloads. Committed once per gesture, on
   * release, never on every pointer move.
   */
  geometry?: WindowGeometry;
  onGeometryChange?: (geometry: WindowGeometry) => void;
  /** Remembered resting place of the collapsed bubble. */
  bubblePosition?: Point | null;
  onBubblePositionChange?: (position: Point) => void;
  /**
   * False puts the focus shield over the body. Leave unset for a single window;
   * pass it when several are open so only one is interactive at a time.
   */
  active?: boolean;
  onFocus?: () => void;
  /** Stacking offset for multiple windows. Clamped below the modal range. */
  stack?: number;
  /** Extra header controls, placed before the built-in ones. */
  actions?: ReactNode;
  /** Overrides for the control labels. Each is both `aria-label` and `title`. */
  labels?: Partial<FloatingWindowLabels>;
  /**
   * Keyboard shortcuts, per action. **Nothing is bound unless you ask.**
   *
   * ```tsx
   * keyBindings={{ close: 'Escape', minimize: ['Ctrl+M', 'Cmd+M'], maximize: 'F11' }}
   * ```
   *
   * Syntax is `tinita/converter/parseKeyCombination`'s, so `cmd`, `⌘`, `option` and
   * `win` are all understood. Listens on `document` while the window is open and
   * `active`. A bare printable key is ignored while the focus is in a text field;
   * anything with a modifier, and named keys such as `Escape`, still fire there.
   */
  keyBindings?: FloatingWindowKeyBindings;
  /** Vertical slot for the default bubble spot, so several never overlap. */
  bubbleSlot?: number;
  /** Forces the colour scheme. Unset follows the host's dark-mode convention. */
  theme?: 'light' | 'dark';
  /** Portal target. Defaults to `document.body`. */
  container?: Element | null;
  className?: string;
}

/**
 * A draggable, resizable window that floats above the page, with a collapsed
 * edge-snapping bubble.
 *
 * Rendered through a portal into `document.body`, because a window positioned inside
 * the app's own tree is trapped by any ancestor that creates a stacking context -
 * `position: fixed` does not escape a transformed parent.
 *
 * **Controlled, and it holds no global state.** `open`, `mode`, `geometry` and the
 * bubble position are all props with optional internal fallbacks. The version this
 * replaces kept a module-level `zustand` store with `persist`, which made a library
 * import install a singleton and write to the consumer's `localStorage` under a key
 * named after the application it came from. Persistence is the consumer's decision,
 * so it is `onGeometryChange` and nothing else.
 *
 * ### Minimize does not unmount
 *
 * The collapsed window keeps its real `width`/`height` and only its CSS transform
 * scales, so the body never reflows to bubble size. An `<iframe>` child therefore
 * keeps its state and does not reload, and restoring costs no layout pass. The body
 * is taken out of hit-testing while collapsed, because an iframe's own
 * `pointer-events: auto` beats a `none` on an ancestor and would otherwise eat every
 * click meant for the bubble.
 *
 * ### Two shields, both for cross-origin iframes
 *
 * A cross-origin iframe swallows pointer events and never lets them reach this
 * document. The **pointer shield** removes the body from hit-testing for the length
 * of a drag or resize, so the gesture is not killed when the pointer crosses the
 * frame. The **focus shield** is a transparent layer over an inactive window's body,
 * which catches the first pointer-down and raises the window, since a click inside
 * the frame cannot. It unmounts once `active` is true.
 *
 * ### Motion is CSS
 *
 * Position, size and collapse scale are handed to the stylesheet as `--tnt-fw-*`
 * custom properties and transitioned there, so `prefers-reduced-motion` switches
 * them off. A JavaScript spring, which is what this replaces, cannot be reached by a
 * media query.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <FloatingWindow open={open} onOpenChange={setOpen} title="Dashboard">
 *   <iframe src="https://example.com" title="Dashboard" />
 * </FloatingWindow>
 * ```
 */
export const FloatingWindow = ({
  open,
  onOpenChange,
  title,
  children,
  icon,
  mode: modeProp,
  onModeChange,
  geometry: geometryProp,
  onGeometryChange,
  bubblePosition = null,
  onBubblePositionChange,
  active = true,
  onFocus,
  stack = 0,
  actions,
  labels: labelOverrides,
  keyBindings,
  bubbleSlot = 0,
  theme,
  container,
  className,
}: FloatingWindowProps) => {
  const { width: viewportWidth, height: viewportHeight } = useWindowSize();

  // Memoised, so the effects below can depend on `viewport` itself rather than on
  // its two fields. Depending on the fields while reading the object is what
  // `react-hooks/exhaustive-deps` flags, and it is a real hazard: the object the
  // effect closes over and the values in the dependency list can disagree.
  const viewport = useMemo(
    () => ({ width: viewportWidth, height: viewportHeight }),
    [viewportWidth, viewportHeight]
  );

  // `useWindowSize` reports 0x0 on the server and for the first client render by
  // design, so there is no hydration mismatch. A window cannot be placed without a
  // viewport, and `createPortal` needs a DOM node, so nothing renders until then.
  // This is also what makes the module safe to import in a server component.
  const measured = viewportWidth > 0 && viewportHeight > 0;

  const [modeState, setModeState] = useState<FloatingWindowMode>('windowed');
  const mode = modeProp ?? modeState;
  const setMode = useCallback(
    (next: FloatingWindowMode) => {
      if (modeProp === undefined) setModeState(next);
      onModeChange?.(next);
    },
    [modeProp, onModeChange]
  );

  const [geometryState, setGeometryState] = useState<WindowGeometry | null>(null);
  const geometry = geometryProp ?? geometryState;
  const setGeometry = useCallback(
    (next: WindowGeometry) => {
      if (geometryProp === undefined) setGeometryState(next);
      onGeometryChange?.(next);
    },
    [geometryProp, onGeometryChange]
  );

  // Seed the uncontrolled geometry once the viewport is known. Done in an effect
  // rather than a `useState` initialiser: an initialiser runs during render, where
  // `window` does not exist on a server. That exact line, in this component's
  // previous form, is the defect `useWindowSize` was rewritten to remove.
  useEffect(() => {
    if (geometryProp !== undefined || geometryState || !measured) return;
    setGeometryState(centredGeometry(viewport));
  }, [geometryProp, geometryState, measured, viewport]);

  // Keep a window inside a viewport that shrank under it - a rotated phone, a
  // resized browser - so the header, and therefore the drag handle, stays reachable.
  useEffect(() => {
    if (!geometry || !measured) return;
    const fitted = clampWindow(geometry, viewport);
    if (
      fitted.x !== geometry.x ||
      fitted.y !== geometry.y ||
      fitted.width !== geometry.width ||
      fitted.height !== geometry.height
    ) {
      setGeometry(fitted);
    }
  }, [geometry, measured, viewport, setGeometry]);

  // Internal fallback, same pattern as `mode` and `geometry`. Without it a consumer
  // who does not wire `onBubblePositionChange` cannot move the bubble at all: the
  // snap result went nowhere, `bubblePosition` never changed, and the bubble jumped
  // straight back to its default spot on release.
  const [bubbleState, setBubbleState] = useState<Point | null>(null);
  const rememberedBubble = bubblePosition ?? bubbleState;
  const setBubble = useCallback(
    (next: Point) => {
      if (bubblePosition === undefined || bubblePosition === null) {
        setBubbleState(next);
      }
      onBubblePositionChange?.(next);
    },
    [bubblePosition, onBubblePositionChange]
  );

  const bubbleRest = measured
    ? bubbleRestPosition(rememberedBubble, viewport, bubbleSlot)
    : { x: 0, y: 0 };

  const drag = useWindowDrag({
    geometry: geometry ?? EMPTY_GEOMETRY,
    viewport,
    onGeometryChange: setGeometry,
    onFocus,
  });

  const snap = useDragSnap({
    viewport,
    position: bubbleRest,
    onSnap: setBubble,
    onTap: () => setMode('windowed'),
  });

  // Before the early return: a hook cannot be called conditionally. `maximized` is
  // derived here rather than below so the action handler can read it.
  const isMaximized = mode === 'maximized';
  const runAction = useCallback(
    (action: FloatingWindowAction) => {
      if (action === 'close') onOpenChange(false);
      else if (action === 'minimize') setMode('minimized');
      else setMode(isMaximized ? 'windowed' : 'maximized');
    },
    [isMaximized, onOpenChange, setMode]
  );
  // `open && active`: a closed window answers no key, and with several open only the
  // one the reader is working in does.
  useKeyBindings(keyBindings, open && active, runAction);

  // Same parse the listener uses, so a control cannot advertise a key it does not
  // answer. Keyed on the serialisation for the reason `useKeyBindings` documents: the
  // prop is written inline and changes identity every render.
  const bindingKey = JSON.stringify(keyBindings ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const parsedBindings = useMemo(() => parseBindings(keyBindings), [bindingKey]);
  // Read once. `navigator.userAgent` does not change, and the guard inside means this
  // is safe during render even where there is no `navigator`.
  const apple = useMemo(() => isApplePlatform(), []);

  /**
   * Accessible name, hover text and `aria-keyshortcuts` for one control.
   *
   * The visible hint shows the combination that MATCHES THE PLATFORM, picked from what
   * the caller bound - showing `⌘ + M` when Control is the key that fires would be a
   * lie. `aria-label` stays the plain action name and the shortcut goes in
   * `aria-keyshortcuts`, which is the attribute ARIA defines for it; folding it into
   * the label would make a modern screen reader announce it twice.
   */
  const controlProps = useCallback(
    (action: FloatingWindowAction, label: string) => {
      const combinations = parsedBindings[action];
      if (!combinations || combinations.length === 0) {
        return { 'aria-label': label, title: label };
      }
      const shown = pickForPlatform(combinations, apple);

      return {
        'aria-label': label,
        title: shown ? `${label} (${formatKeyCombination(shown, apple)})` : label,
        // Every bound alternative, not only the one on display: they all work.
        'aria-keyshortcuts': toAriaKeyShortcuts(combinations),
      };
    },
    [apple, parsedBindings]
  );

  if (!open || !measured || !geometry) return null;

  const maximized = isMaximized;
  const minimized = mode === 'minimized';

  // Visible layout box. Maximized fills the viewport; the body re-lays-out to that
  // size on purpose, which is what a dashboard in an iframe wants.
  const box = maximized ? { x: 0, y: 0, width: viewport.width, height: viewport.height } : drag.box;

  // Collapse target. Scale, not width/height, so the body keeps its layout - see the
  // note on minimize above. Guarded against a zero box, which would divide by zero
  // and emit `scale(Infinity)`.
  const scaleX = minimized && box.width > 0 ? BUBBLE_SIZE / box.width : 1;
  const scaleY = minimized && box.height > 0 ? BUBBLE_SIZE / box.height : 1;

  const style = {
    '--tnt-fw-x': `${minimized ? bubbleRest.x : box.x}px`,
    '--tnt-fw-y': `${minimized ? bubbleRest.y : box.y}px`,
    '--tnt-fw-width': `${box.width}px`,
    '--tnt-fw-height': `${box.height}px`,
    '--tnt-fw-scale-x': scaleX,
    '--tnt-fw-scale-y': scaleY,
    zIndex: maximized ? Z_CEILING + 1 : Math.min(Z_BASE + stack, Z_CEILING),
  } as CSSProperties;

  const labels = { ...DEFAULT_LABELS, ...labelOverrides };

  const headerIcon = icon ?? <WindowIcon />;

  const tree = (
    <>
      <div
        className={cn(styles.root, className)}
        style={style}
        {...variantAttributes({
          mode,
          active,
          dragging: drag.interacting,
          theme,
        })}
        // Capture phase, so the window is raised before the drag handler begins and
        // before a control button stops propagation.
        onPointerDownCapture={onFocus}
        // The move and release handlers belong here, not on the header: pointer
        // capture is taken by the element that starts the gesture, and these keep
        // receiving the events even while the pointer is over the body.
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerCancel}
      >
        <div
          className={styles.header}
          {...variantAttributes({ mode })}
          onPointerDown={maximized ? undefined : drag.onHeaderPointerDown}
          onDoubleClick={() => setMode(maximized ? 'windowed' : 'maximized')}
        >
          <div className={styles.title}>
            <span className={styles.icon}>{headerIcon}</span>
            <span className={styles.titleText}>{title}</span>
          </div>

          {/* Stops a press on a control from also starting a header drag. */}
          <div className={styles.actions} onPointerDown={(event) => event.stopPropagation()}>
            {actions}
            <button
              type="button"
              className={styles.button}
              {...controlProps('minimize', labels.minimize)}
              onClick={() => setMode('minimized')}
            >
              <MinimizeIcon />
            </button>
            <button
              type="button"
              className={styles.button}
              {...controlProps('maximize', maximized ? labels.restore : labels.maximize)}
              onClick={() => setMode(maximized ? 'windowed' : 'maximized')}
            >
              {maximized ? <RestoreIcon /> : <MaximizeIcon />}
            </button>
            <button
              type="button"
              className={styles.button}
              {...controlProps('close', labels.close)}
              onClick={() => onOpenChange(false)}
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div
          className={styles.body}
          {...variantAttributes({ inert: drag.interacting || minimized })}
        >
          {children}
          {!active && !minimized && !maximized && (
            <div className={styles.shield} onPointerDown={onFocus} aria-hidden />
          )}
        </div>

        {!maximized && !minimized && (
          <div className={styles.resize} onPointerDown={drag.onResizePointerDown} aria-hidden />
        )}
      </div>

      {minimized && (
        <button
          type="button"
          className={styles.bubble}
          style={
            {
              '--tnt-fw-x': `${snap.rendered.x}px`,
              '--tnt-fw-y': `${snap.rendered.y}px`,
              zIndex: Z_CEILING,
            } as CSSProperties
          }
          {...variantAttributes({ dragging: snap.dragging, theme })}
          aria-label={title}
          title={title}
          {...snap.handlers}
        >
          {headerIcon}
        </button>
      )}
    </>
  );

  return createPortal(tree, container ?? document.body);
};
