/** The CSS absolute length units. */
export type LengthUnit = 'px' | 'in' | 'cm' | 'mm' | 'pt' | 'pc' | 'q';

/**
 * How many CSS pixels are in one of each unit.
 *
 * These are **exact by specification**, not measured. CSS Values and Units defines
 * `1in = 96px = 2.54cm = 25.4mm = 72pt = 6pc`, and `1q` as a quarter-millimetre.
 * A CSS `mm` is therefore a fixed ratio to `px` and has nothing to do with the
 * physical size of the screen - which is why there is no device to ask.
 */
const PX_PER_UNIT: Readonly<Record<LengthUnit, number>> = {
  px: 1,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / 25.4 / 4,
  pt: 96 / 72,
  pc: 16,
};

/**
 * Convert between CSS absolute length units.
 *
 * Pure: the same arguments always give the same number, on a server as in a browser.
 * No DOM, no measurement, no cache.
 *
 * **Replaces a class that measured a DPI that does not exist.** Measured 2026-10-01,
 * the version this replaced built a `<div style="height: 100mm">`, appended it to
 * `document.body`, read `offsetHeight` and derived a DPI, averaging four sizes:
 *
 * ```
 *   50mm  exact 188.9764px  offsetHeight 189   derived DPI 96.012000
 *  100mm  exact 377.9528px  offsetHeight 378   derived DPI 96.012000
 *  500mm  exact 1889.7638px offsetHeight 1890  derived DPI 96.012000
 * 1000mm  exact 3779.5276px offsetHeight 3780  derived DPI 96.012000
 * ```
 *
 * Every size gives the same answer because the ratio is fixed by the spec; what the
 * four samples actually measured was `offsetHeight` rounding to an integer. The
 * value is 96 exactly, and its hard-coded fallback `96.01199999999999` was that
 * rounding artifact. Three consequences of the old approach, all now gone:
 *
 * - It ran at class-definition time, so **importing** the module appended four divs
 *   to `document.body` - a side effect in a package declaring `sideEffects: false`.
 * - In any environment without layout the reading was `0`, so every `px` conversion
 *   silently returned `0`. Measured in jsdom.
 * - Its rate table was a `private static` field that the constructor overwrote, so
 *   constructing a second converter broke the first.
 *
 * Relative units (`em`, `rem`, `%`, `vw`) are **not** here and cannot be: they
 * depend on an element's computed font size or the viewport, so converting one needs
 * a DOM node, not a ratio. Read them with `getComputedStyle`.
 *
 * @throws {TypeError} if `value` is not a finite number, or if either unit is not a
 *   CSS absolute length unit. Unit names are matched case-insensitively.
 *
 * @example
 * ```ts
 * convertLength(1, 'in', 'px');    // 96
 * convertLength(25.4, 'mm', 'in'); // 1
 * convertLength(12, 'pt', 'pc');   // 1
 * convertLength(96, 'px', 'px');   // 96
 * ```
 */
export function convertLength(
  value: number,
  from: LengthUnit,
  to: LengthUnit
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(
      `convertLength: expected a finite number, got ${value}`
    );
  }

  const fromKey = String(from).toLowerCase() as LengthUnit;
  const toKey = String(to).toLowerCase() as LengthUnit;

  const fromRate = PX_PER_UNIT[fromKey];
  const toRate = PX_PER_UNIT[toKey];
  const known = Object.keys(PX_PER_UNIT).join(', ');

  if (fromRate === undefined) {
    throw new TypeError(
      `convertLength: ${JSON.stringify(from)} is not a CSS absolute length unit. Known: ${known}`
    );
  }
  if (toRate === undefined) {
    throw new TypeError(
      `convertLength: ${JSON.stringify(to)} is not a CSS absolute length unit. Known: ${known}`
    );
  }

  if (fromKey === toKey) return value;

  return (value * fromRate) / toRate;
}
