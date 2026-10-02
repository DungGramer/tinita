/**
 * Establishes: `value` is a `number`, and it is neither `NaN` nor `±Infinity`.
 *
 * This is the invariant TypeScript cannot express. `number` includes `NaN`,
 * `Infinity`, `-Infinity`, `0` and negatives, so a signature saying `value: number`
 * admits every one of them - and a package published to npm can be called from plain
 * JavaScript, where the declaration guards nothing at all.
 *
 * Says nothing about sign or integrality. See `assertPositiveFiniteNumber` and
 * `assertInteger`.
 *
 * The error reports the value itself for a number, so `got NaN` is distinguishable
 * from `got string` - which is the difference between a calculation that went wrong
 * upstream and an argument of the wrong type.
 *
 * @throws {TypeError} if `value` is not a number, or is not finite.
 *
 * @example
 * ```ts
 * export function roundTo(value: unknown, places: number): number {
 *   assertFiniteNumber(value, 'roundTo');
 *   return Number(value.toFixed(places)); // value: number
 * }
 * ```
 */
export function assertFiniteNumber(
  value: unknown,
  caller: string,
  label = 'value'
): asserts value is number {
  if (typeof value !== 'number') {
    throw new TypeError(
      `${caller}: ${label} must be a finite number, got ${typeof value}`
    );
  }
  if (!Number.isFinite(value)) {
    throw new TypeError(
      `${caller}: ${label} must be a finite number, got ${value}`
    );
  }
}
