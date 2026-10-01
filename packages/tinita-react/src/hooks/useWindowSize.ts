import { useMemo, useSyncExternalStore } from 'react';

export interface WindowSize {
  width: number;
  height: number;
}

/**
 * The snapshot is a **string**, not an object.
 *
 * `useSyncExternalStore` compares snapshots with `Object.is`, so returning a fresh
 * `{ width, height }` each time makes it see a change on every check and re-render
 * forever. Encoding as `"1440x900"` makes equal sizes compare equal. This is the
 * classic trap of the API and the reason the shape looks odd.
 */
const read = (): string => `${window.innerWidth}x${window.innerHeight}`;

/** Server and first client render agree on this, so there is no hydration mismatch. */
const SERVER_SNAPSHOT = '0x0';

const subscribe = (onStoreChange: () => void): (() => void) => {
  let frame = 0;
  const onResize = () => {
    // `resize` fires on every frame while a window is dragged. Coalescing with
    // requestAnimationFrame turns a burst into one notification, and rAF stops
    // entirely while the tab is hidden - which setTimeout would not.
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      onStoreChange();
    });
  };

  window.addEventListener('resize', onResize);

  return () => {
    if (frame !== 0) cancelAnimationFrame(frame);
    window.removeEventListener('resize', onResize);
  };
};

/**
 * The window's inner size, kept current.
 *
 * Returns `{ width: 0, height: 0 }` on the server and for the first client render,
 * then the real size. Check for `0` if the first paint depends on it - or better,
 * use a CSS media query, which needs no JavaScript and no second render.
 *
 * Built on `useSyncExternalStore`, so React owns the subscription and the value is
 * consistent across concurrent renders.
 *
 * **Replaces a version that could not run on a server at all**, under a comment
 * claiming the opposite:
 *
 * ```ts
 * // Initialize state with undefined width/height so server and client renders match
 * const [windowSize, setWindowSize] = useState({
 *   width: window.innerWidth,   // reads window IN the initialiser
 *   height: window.innerHeight,
 * });
 * ```
 *
 * On the server that is `ReferenceError: window is not defined`, not a mismatch. It
 * also used `useLayoutEffect` rather than the package's own
 * `useIsomorphicLayoutEffect`, so React logged a second warning during SSR, and it
 * called `setState` on every `resize` event - about 60 times a second for the whole
 * duration of a window drag, with no coalescing.
 *
 * `resize` does not fire for a change in `devicePixelRatio` alone, so moving the
 * window to a display of the same size but different density will not update this.
 *
 * @example
 * ```tsx
 * const { width } = useWindowSize();
 * if (width === 0) return null;      // first render, size not known yet
 * return width < 768 ? <Compact /> : <Full />;
 * ```
 */
export function useWindowSize(): WindowSize {
  const snapshot = useSyncExternalStore(subscribe, read, () => SERVER_SNAPSHOT);

  // Memoised on the snapshot string so the returned object is referentially stable
  // between renders. Without this, a consumer's `useEffect(..., [size])` would run on
  // every render instead of only when the size changed.
  return useMemo(() => {
    const [width, height] = snapshot.split('x');

    return { width: Number(width), height: Number(height) };
  }, [snapshot]);
}
