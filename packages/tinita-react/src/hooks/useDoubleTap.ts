import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent, MouseEventHandler } from 'react';

export type DoubleTapHandler<Target = Element> = MouseEventHandler<Target>;

export interface UseDoubleTapOptions<Target = Element> {
  /**
   * Called when a second click does **not** arrive within `threshold`.
   *
   * Note the consequence of having both: a single tap is reported only after the
   * threshold has elapsed, so `onSingleTap` always runs `threshold` ms late. That is
   * unavoidable - a single tap is only knowable once the window for a second has
   * closed - and it is why the default threshold is short.
   */
  onSingleTap?: DoubleTapHandler<Target>;
  /** Milliseconds allowed between the two clicks. 300 by default. */
  threshold?: number;
}

/**
 * Props to spread onto an element to detect a double tap.
 *
 * `{}` when `callback` is `null`, so the feature can be switched off without the
 * element gaining a handler that does nothing.
 */
export type UseDoubleTapResult<Target = Element> =
  | { onClick: DoubleTapHandler<Target> }
  | Record<string, never>;

/**
 * Detect two clicks in quick succession and return props to spread.
 *
 * **It listens to `onClick`, so despite the name this is a double *click*.** On a
 * touchscreen the browser synthesises a click from a tap, which is why it works
 * there at all - but a two-finger tap, a long press and a swipe are not clicks and
 * will not reach it. For real gestures use pointer events.
 *
 * Pass `null` as the callback to disable it; the result is then `{}`.
 *
 * **The timer is cleared on unmount.** The version this replaced did not clear it,
 * so a component unmounted inside the threshold still ran `onSingleTap` afterwards -
 * a callback firing against a component that no longer exists, which is how a
 * setState-after-unmount warning or a stale closure write happens.
 *
 * `options` is read through a ref rather than listed as a dependency. The version
 * this replaced put the whole object in the `useCallback` deps, so a caller writing
 * `useDoubleTap(fn, 300, { onSingleTap })` inline - the ordinary way to call it -
 * created a new object every render and defeated the memoisation entirely.
 *
 * @example
 * ```tsx
 * const props = useDoubleTap(() => setLiked(true), {
 *   onSingleTap: () => setSelected(true),
 * });
 * <img {...props} src={photo} alt="" />
 * ```
 */
export function useDoubleTap<Target = Element>(
  callback: DoubleTapHandler<Target> | null,
  options: UseDoubleTapOptions<Target> = {}
): UseDoubleTapResult<Target> {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest-value ref: keeps `handler` stable while still calling the current
  // callbacks, so neither an inline options object nor an inline callback causes a
  // new handler on every render.
  const latest = useRef({ callback, options });
  latest.current = { callback, options };

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    []
  );

  const handler = useCallback<DoubleTapHandler<Target>>((event: MouseEvent<Target>) => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
      latest.current.callback?.(event);

      return;
    }

    const { threshold = 300 } = latest.current.options;
    timer.current = setTimeout(() => {
      timer.current = null;
      latest.current.options.onSingleTap?.(event);
    }, threshold);
  }, []);

  return callback ? { onClick: handler } : {};
}
