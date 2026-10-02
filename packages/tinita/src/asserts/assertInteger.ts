import { assertFiniteNumber } from './assertFiniteNumber';

/**
 * Establishes: `value` is a `number` with no fractional part.
 *
 * Negatives and zero pass - this is about integrality alone. `Number.isInteger`
 * already excludes `NaN` and `Infinity`, but this goes through
 * `assertFiniteNumber` first so a non-number reports as a type problem rather than
 * as a fractional one.
 *
 * @throws {TypeError} if `value` is not a number, is not finite, or has a fractional
 *   part.
 *
 * @example
 * ```ts
 * assertInteger(start, 'createRange', 'start');
 * assertInteger(end, 'createRange', 'end');
 * ```
 */
export function assertInteger(
  value: unknown,
  caller: string,
  label = 'value'
): asserts value is number {
  assertFiniteNumber(value, caller, label);
  if (!Number.isInteger(value)) {
    throw new TypeError(`${caller}: ${label} must be an integer, got ${value}`);
  }
}
