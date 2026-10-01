/* eslint-disable @typescript-eslint/no-explicit-any -- `(...args: any[]) => any` is
   the constraint shape for "any function"; `unknown[]` breaks parameter variance so
   a function taking concrete arguments stops matching T. lib.es5.d.ts uses the same
   shape. */
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
