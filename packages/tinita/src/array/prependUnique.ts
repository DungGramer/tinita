import { assertArray } from '../asserts/assertArray';
/**
 * Prepend items to a list, skipping any whose key is already present.
 *
 * Returns a new array; the input is never mutated. New items come first, which is
 * what a "most recently added" list wants.
 *
 * Duplicates **within** `itemsToAdd` are also collapsed, first occurrence winning.
 *
 * @param uniqueKey property to compare by. Comparison is `Set` identity, so object
 *   values are matched by reference, not by shape.
 *
 * @example
 * ```ts
 * prependUnique([{ value: 'a' }], [{ value: 'a' }, { value: 'b' }]);
 * // [{ value: 'b' }, { value: 'a' }]
 * ```
 */
export function prependUnique<T extends Record<string, unknown>>(
  list: T[],
  itemsToAdd: T | T[],
  uniqueKey: keyof T = 'value' as keyof T
): T[] {
  // The version this replaced called `isEmpty(itemsToAdd)` without importing it
  // from anywhere, so it threw ReferenceError on every call. It then returned a
  // non-array argument unchanged, which was a silent failure and the only array
  // function here that did not throw.
  assertArray(list, 'prependUnique', 'list');

  const items = Array.isArray(itemsToAdd) ? itemsToAdd : [itemsToAdd];
  if (items.length === 0) return list;

  const seen = new Set(list.map((item) => item[uniqueKey]));

  const additions = items.filter((item) => {
    const key = item[uniqueKey];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return [...additions, ...list];
}
