/**
 * Establishes: `value` is an array.
 *
 * Says nothing about its length or its elements - `[]` passes, and so does an array
 * of anything. Element checks belong to the caller, which knows what the elements
 * should be; `sortAlphaText` reads each item and reports the offending index itself,
 * and that is the right shape. Validating every element here would be the wrong
 * place and, on a long array, the wrong cost.
 *
 * `Array.isArray` rather than `instanceof Array`, so an array from another realm -
 * an iframe, a worker, a `vm` context - is recognised.
 *
 * Note for TypeScript: the narrowing is to `unknown[]`. A caller that needs
 * `string[]` still has to check the elements, and the type will say so.
 *
 * @throws {TypeError} if `value` is not an array.
 *
 * @example
 * ```ts
 * assertArray(dates, 'sortDates', 'dates');
 * ```
 */
export function assertArray(
  value: unknown,
  caller: string,
  label = 'value'
): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(
      `${caller}: ${label} must be an array, got ${value === null ? 'null' : typeof value}`
    );
  }
}
