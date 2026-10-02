import { assertArray } from '../asserts/assertArray';
import { assertObject } from '../asserts/assertObject';

/**
 * A new object holding every own enumerable property of `obj` except `keys`.
 *
 * Only own enumerable string-keyed properties are copied, so the prototype,
 * non-enumerable properties and symbol keys are dropped. Getters are read, not
 * copied.
 *
 * Returns a new object; `obj` is never mutated.
 *
 * Throws `TypeError` if `obj` is not an object, or if `keys` is not an array. The
 * version this replaced returned the argument unchanged for `null`.
 *
 * Exported as `omit`, lowercase. The version this replaced exported `Omit`, which
 * collides with TypeScript's built-in `Omit<T, K>` utility type.
 *
 * @example
 * ```ts
 * omit({ a: 1, b: 2 }, ['b']);  // { a: 1 }
 * omit({ a: 1 }, []);           // { a: 1 } - a copy, not the same reference
 * ```
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Omit<T, K> {
  assertObject(obj, 'omit', 'obj');
  // Guard through an alias: `Array.isArray` narrows `readonly K[]` to `any[]`, which
  // loses K and makes every later index an implicit `any`.
  const keyList: unknown = keys;
  assertArray(keyList, 'omit', 'keyList');

  const excluded = new Set<unknown>(keys);
  const result = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (!excluded.has(key)) result[key] = value;
  }

  return result as Omit<T, K>;
}
