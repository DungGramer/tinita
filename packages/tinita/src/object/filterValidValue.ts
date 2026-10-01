export interface FilterValidValueOptions {
  /**
   * Values to drop. Compared with `includes`, so `NaN` is matched too.
   *
   * @default [null, undefined]
   */
  invalidValues?: unknown[];
  /**
   * Keys to drop regardless of value.
   *
   * @default []
   */
  omitKeys?: string[];
}

/**
 * Drop unwanted entries from an object, recursing into nested plain objects.
 *
 * Returns `Partial<T>`, not `T`: the whole job is removing keys, and a function
 * that removes keys cannot honestly promise the input type back.
 *
 * Empty arrays are dropped. Nested plain objects are filtered and kept even when
 * the result is empty, so the shape of the tree survives.
 *
 * Only plain objects are recursed into. A `Date`, `Map`, `Blob` or class instance
 * is passed through whole, because taking one apart by its enumerable keys
 * destroys it.
 *
 * `omitKeys` defaults to empty. The version this replaced defaulted it to
 * `['page', 'size']`, which is a pagination convention from one application that
 * had no business being the default of a general utility.
 *
 * @throws {TypeError} if `obj` is not an object, or if it contains a cycle. The
 *   version this replaced recursed into cycles until the stack overflowed.
 *
 * @example
 * ```ts
 * filterValidValue({ a: 1, b: null, c: [], d: { e: undefined, f: 2 } });
 * // { a: 1, d: { f: 2 } }
 * ```
 */
export function filterValidValue<T extends Record<string, unknown>>(
  obj: T,
  options: FilterValidValueOptions = {}
): Partial<T> {
  const invalidValues = options.invalidValues ?? [null, undefined];
  const omitKeys = options.omitKeys ?? [];

  return filter(obj, invalidValues, omitKeys, new WeakSet());
}

function filter<T extends Record<string, unknown>>(
  obj: T,
  invalidValues: unknown[],
  omitKeys: string[],
  seen: WeakSet<object>
): Partial<T> {
  if (obj === null || typeof obj !== 'object') {
    throw new TypeError(
      `filterValidValue() expects an object, received ${obj === null ? 'null' : typeof obj}`
    );
  }
  if (seen.has(obj)) {
    throw new TypeError(
      'filterValidValue() received an object containing a cycle'
    );
  }
  seen.add(obj);

  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj) as [
    keyof T & string,
    unknown,
  ][]) {
    if (omitKeys.includes(key)) continue;
    if (invalidValues.includes(value)) continue;
    if (Array.isArray(value) && value.length === 0) continue;

    result[key] = isPlainObject(value)
      ? (filter(value, invalidValues, omitKeys, seen) as T[typeof key])
      : (value as T[typeof key]);
  }

  return result;
}

/**
 * Plain object, not just "typeof object".
 *
 * `typeof null === 'object'` is the classic trap, and so is treating a `Date` as a
 * bag of keys - `Object.entries(new Date())` is `[]`, so recursing into one would
 * silently replace the date with `{}`.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value) as object | null;
  return proto === Object.prototype || proto === null;
}
