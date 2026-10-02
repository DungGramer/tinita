import { assertFiniteNumber } from './assertFiniteNumber';

/**
 * Establishes: `value` is a finite `number` greater than zero.
 *
 * Zero is **refused**. The name says positive, and the cases this exists for - a
 * resolution, a scale factor, a divisor - all break at zero rather than merely
 * degrading.
 *
 * Built on `assertFiniteNumber`, so a non-number or a `NaN` reports as that first.
 * Two messages rather than one combined check, because "got string" and "got -5"
 * point at different mistakes.
 *
 * `TypeError`, not `RangeError`: positivity is a value contract, not a bounded range.
 * `RangeError` is reserved for an explicit interval such as `0..1`. See
 * `docs/code-standards.md`, "Quy Tắc Validation".
 *
 * @throws {TypeError} if `value` is not a number, is not finite, or is `<= 0`.
 *
 * @example
 * ```ts
 * assertPositiveFiniteNumber(scale, 'resizeImage', 'scale');
 * ```
 */
export function assertPositiveFiniteNumber(
  value: unknown,
  caller: string,
  label = 'value'
): asserts value is number {
  assertFiniteNumber(value, caller, label);
  if (value <= 0) {
    throw new TypeError(
      `${caller}: ${label} must be a positive finite number, got ${value}`
    );
  }
}
