import { assertPositiveFiniteNumber } from './assertPositiveFiniteNumber';

/**
 * Establishes: `dpi` is a finite number greater than zero.
 *
 * A domain name over a generic one, deliberately. `assertDpi(dpi, caller)` reads as
 * one idea; `assertPositiveFiniteNumber(dpi, caller, 'dpi')` makes the reader
 * reconstruct why a resolution has to be positive and finite. The implementation is
 * the generic primitive, so there is one place where the arithmetic lives and one
 * place where the meaning does.
 *
 * Resolution here is always a **requirement the caller was given** - what a press
 * asked for - never a property of a device. No browser reports physical screen
 * density; see the "Printing" section of the README for the measurements behind that.
 *
 * @throws {TypeError} if `dpi` is not a number, is not finite, or is `<= 0`.
 *
 * @example
 * ```ts
 * assertDpi(dpi, 'toPrintPixels');
 * // TypeError: toPrintPixels: dpi must be a positive finite number, got -300
 * ```
 */
export function assertDpi(dpi: unknown, caller: string): asserts dpi is number {
  assertPositiveFiniteNumber(dpi, caller, 'dpi');
}
