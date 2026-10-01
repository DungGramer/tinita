export interface SortAlphaTextOptions<T> {
  /** `'asc'` by default. */
  order?: 'asc' | 'desc';
  /** Reads the string to compare. Required unless the items are already strings. */
  key?: (item: T) => string;
  /**
   * BCP 47 locale. `'en'` by default, **not** the host locale.
   *
   * Pass `'vi'` for Vietnamese: the orders genuinely differ. Measured 2026-10-01
   * on `['Ánh', 'Anh', 'Ẩn', 'Ba']`:
   *
   * ```
   * 'vi'  ->  Anh  Ánh  Ẩn   Ba     correct
   * 'en'  ->  Ẩn   Anh  Ánh  Ba
   * ```
   */
  locale?: string;
  /** Passed straight to `Intl.Collator`. `{ numeric: true }` sorts `item2` before `item10`. */
  collator?: Intl.CollatorOptions;
}

/**
 * Sort by a string key, using a real collator.
 *
 * Returns a new array. The version this replaced called `arr.sort()`, which sorts
 * **in place** - it mutated the caller's array while also returning it, so the bug
 * only showed up when someone still needed the original order.
 *
 * The locale defaults to `'en'` and never to the host locale. The version this
 * replaced used bare `localeCompare`, which reads the environment's locale, so the
 * same input sorted differently on different machines - and silently wrong for
 * Vietnamese. See `locale`.
 *
 * Comparison goes through one `Intl.Collator` built per call, not `localeCompare`
 * per comparison, so the collator is constructed once instead of O(n log n) times.
 *
 * Throws `TypeError` on a non-array, or when an item is not a string and no `key` is
 * given. The version this replaced cast items to `string` and let
 * `keyA.localeCompare` throw `TypeError: keyA.localeCompare is not a function`,
 * naming neither this function nor the offending item.
 *
 * Ties keep their input order (`Array.prototype.sort` is stable).
 *
 * @example
 * ```ts
 * sortAlphaText(['b', 'a']);                                  // ['a', 'b']
 * sortAlphaText(['Ánh', 'Anh', 'Ẩn'], { locale: 'vi' });       // ['Anh', 'Ánh', 'Ẩn']
 * sortAlphaText(users, { key: (u) => u.name, order: 'desc' });
 * sortAlphaText(['item10', 'item2'], { collator: { numeric: true } });
 * ```
 */
export function sortAlphaText<T>(
  list: T[],
  options: SortAlphaTextOptions<T> = {}
): T[] {
  if (!Array.isArray(list)) {
    throw new TypeError(`sortAlphaText: expected an array, got ${typeof list}`);
  }

  const { order = 'asc', key, locale = 'en', collator } = options;
  const compare = new Intl.Collator(locale, collator).compare;
  const direction = order === 'asc' ? 1 : -1;

  const read = (item: T, position: number): string => {
    if (key) return key(item);
    if (typeof item === 'string') return item;
    throw new TypeError(
      `sortAlphaText: item at index ${position} is ${typeof item}, not a string. Pass \`key\` to read the string to compare.`
    );
  };

  return list
    .map((item, position) => [read(item, position), item] as const)
    .sort((left, right) => compare(left[0], right[0]) * direction)
    .map(([, item]) => item);
}
