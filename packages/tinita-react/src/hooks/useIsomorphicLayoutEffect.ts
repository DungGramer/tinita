/**
 * `useLayoutEffect` in a browser, `useEffect` on a server.
 *
 * React warns that `useLayoutEffect` does nothing during server rendering, and the
 * warning is correct but unactionable for library code that must run in both - so
 * the hook to call is chosen once, at module load, by whether `window` exists.
 *
 * Use it wherever a layout read must happen before paint: measuring an element,
 * setting scroll position, syncing a CSS variable from a measurement. For anything
 * that does not need to block paint, plain `useEffect` is correct and cheaper.
 *
 * The choice is made at module load, not per render, so it is stable for the life of
 * the process - React requires the hook identity not to change between renders.
 */
import { useEffect, useLayoutEffect } from 'react';

export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
