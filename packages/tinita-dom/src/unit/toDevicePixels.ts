import { assertFiniteNumber } from 'tinita/asserts/assertFiniteNumber';
import { convertLength, type LengthUnit } from 'tinita/unit/convertLength';

/**
 * Convert a CSS length to **device** pixels - the hardware pixels the screen will
 * actually light up.
 *
 * This is the part that varies per screen, and the reason `convertLength` alone is
 * not enough. `convertLength` works in CSS pixels, which are a fixed ratio to `mm`
 * and `in` by specification; this multiplies by `devicePixelRatio`, which the
 * browser sets from the display and the OS zoom level.
 *
 * Measured in Chromium 2026-10-01 across `deviceScaleFactor` 1, 1.5, 2 and 3 and
 * two viewport sizes:
 *
 * ```
 * deviceScaleFactor  devicePixelRatio  offsetHeight of a 100mm div
 * 1                  1                 378
 * 1.5                1.5               378
 * 2                  2                 378
 * 3                  3                 378
 * ```
 *
 * The layout size never moves - that is why probing a `<div>` cannot detect the
 * screen, and why the class this replaced returned the same 96.012 everywhere.
 * `devicePixelRatio` is the number that tracks the display.
 *
 * Use it to size a canvas backing store so drawing is sharp on a retina screen, or
 * to decide which image density to request.
 *
 * **It still does not give physical size.** No browser API reports the screen's
 * physical dimensions, so "draw exactly one real-world inch" is not achievable on
 * the web - by design, for fingerprinting reasons. `devicePixelRatio` answers "how
 * many hardware pixels is this CSS length", not "how many millimetres of glass".
 *
 * Reads `devicePixelRatio` at call time and does not cache it: the value changes
 * when the window moves to another display or the user zooms. Listen to
 * `matchMedia('(resolution: 1dppx)')` if you need to react.
 *
 * Falls back to a ratio of `1` where `devicePixelRatio` is absent.
 *
 * @throws {TypeError} for a non-finite value or an unknown unit, via `convertLength`.
 *
 * @example
 * ```ts
 * // A crisp canvas at any density.
 * canvas.width = toDevicePixels(cssWidth, 'px');
 * canvas.style.width = `${cssWidth}px`;
 *
 * toDevicePixels(1, 'in'); // 96 at dpr 1, 192 at dpr 2
 * ```
 */
export function toDevicePixels(value: number, unit: LengthUnit = 'px'): number {
  const cssPixels = convertLength(value, unit, 'px');
  const ratio =
    typeof devicePixelRatio === 'number' && devicePixelRatio > 0
      ? devicePixelRatio
      : 1;

  return cssPixels * ratio;
}

/**
 * Convert device pixels back to a CSS length.
 *
 * The inverse of `toDevicePixels` at the same `devicePixelRatio`. Because the ratio
 * is read at call time, a round trip across a display change will not come back to
 * the same number - that is the display changing, not a defect.
 *
 * @throws {TypeError} for a non-finite value or an unknown unit.
 */
export function fromDevicePixels(
  value: number,
  unit: LengthUnit = 'px'
): number {
  assertFiniteNumber(value, 'fromDevicePixels');

  const ratio =
    typeof devicePixelRatio === 'number' && devicePixelRatio > 0
      ? devicePixelRatio
      : 1;

  return convertLength(value / ratio, 'px', unit);
}
