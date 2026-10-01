/* eslint-disable @typescript-eslint/no-explicit-any -- `(...args: any[]) => any` is
   the constraint shape for "any function"; `unknown[]` breaks parameter variance so
   a function taking concrete arguments stops matching T. lib.es5.d.ts uses the same
   shape. */
/**
 * Wraps `func` so it runs at most once. Later calls return the first result without
 * calling through.
 *
 * The result is remembered even when it is `undefined`, so a void function really
 * does run only once.
 *
 * `this` and arguments are forwarded on the **first** call only. Arguments to later
 * calls are ignored, not compared - this is not memoisation by argument. If the
 * caller needs per-argument caching, that is a different function.
 *
 * A throw is **not** remembered: if `func` throws, the call is not counted and the
 * next call tries again. That is the useful behaviour for the usual job of `once`
 * (initialise a connection, inject a stylesheet) where a failed attempt should not
 * poison the result forever. The trade-off is that a reliably-throwing `func` is
 * called every time.
 *
 * @example
 * ```ts
 * const init = once(() => console.log('once'));
 * init(); init(); init();  // logs one line
 * ```
 */
export function once<T extends (...args: any[]) => any>(func: T): T {
  let ran = false;
  let result: ReturnType<T>;
  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    if (ran) return result;
    result = func.apply(this, args);
    ran = true;
    return result;
  } as T;
}
