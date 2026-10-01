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
 * uniquePushArray([{ value: 'a' }], [{ value: 'a' }, { value: 'b' }]);
 * // [{ value: 'b' }, { value: 'a' }]
 * ```
 */
export function uniquePushArray<T extends Record<string, unknown>>(
  list: T[],
  itemsToAdd: T | T[],
  uniqueKey: keyof T = 'value' as keyof T
): T[] {
  // The version this replaced called `isEmpty(itemsToAdd)` without importing it
  // from anywhere, so it threw ReferenceError on every call.
  if (!Array.isArray(list)) return list;

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
