import { assertObject } from '../asserts/assertObject';
import { sortAlphaText } from '../array/sortAlphaText';

/**
 * A new object with the same own enumerable entries, keys in sorted order.
 *
 * Useful where key order is observable: a stable cache key, a diffable JSON dump, a
 * signature over a serialised payload.
 *
 * Only own enumerable string keys are carried over. Integer-like keys are a
 * JavaScript exception that no sort can fix: an object always enumerates those in
 * ascending numeric order first, whatever order they are inserted in. So
 * `sortObjectKeys({ 2: 'a', 1: 'b' })` enumerates `1` then `2` regardless.
 *
 * Sorting is `'en'` by default, not the host locale, so the same input gives the
 * same key order on every machine. Pass `locale` for a different collation.
 *
 * Returns a new object; `obj` is never mutated.
 *
 * Throws `TypeError` on a non-object. The version this replaced returned the
 * argument unchanged for `null`.
 *
 * @example
 * ```ts
 * sortObjectKeys({ b: 1, a: 2 });               // { a: 2, b: 1 }
 * sortObjectKeys(payload, { locale: 'vi' });
 * ```
 */
export function sortObjectKeys<T extends Record<string, unknown>>(
  obj: T,
  options: { locale?: string } = {}
): T {
  assertObject(obj, 'sortObjectKeys', 'obj');

  const sorted = sortAlphaText(Object.keys(obj), { locale: options.locale });

  return sorted.reduce((acc, key) => {
    acc[key as keyof T] = obj[key as keyof T];

    return acc;
  }, {} as T);
}
