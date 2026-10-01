import { convertLength, type LengthUnit } from './convertLength';

/**
 * Output resolutions a print shop actually asks for.
 *
 * These are **requirements you are given**, not properties of any device. A shop
 * specifies 300; you encode 300. Nothing about the end user's screen enters into it -
 * and nothing can, because no browser reports physical screen size.
 */
export const PRINT_DPI = {
  /** Screen-equivalent. Only for a draft or an on-screen proof. */
  draft: 72,
  /** Common floor for photographic output. */
  photo: 150,
  /** The usual answer for offset and digital press work. */
  offset: 300,
  /** Line art, barcodes, fine rules - anything where a half-pixel edge shows. */
  lineArt: 600,
} as const;

/**
 * A physical length to raster pixels at a chosen output resolution.
 *
 * This is the one place in printing where a DPI number belongs, and it is **your**
 * number: the resolution the press requires, passed in. Use it when generating a
 * raster that will be printed - a canvas you export as PNG, or an image embedded in
 * a PDF.
 *
 * **For laying out a page, do not use this.** Write `mm` or `in` in CSS and let the
 * browser map them to paper; it knows the printer's resolution and JavaScript never
 * does. Measured with Chromium's PDF output 2026-10-01: `@page { size: 100mm 50mm }`
 * produced a MediaBox of 282.96 x 142.08 pt, which is 99.82 x 50.12 mm, **identical
 * at `devicePixelRatio` 1, 2 and 3**. The screen plays no part.
 *
 * Note the contrast with `convertLength`, which answers a different question:
 *
 * ```
 * convertLength(210, 'mm', 'px')        // 793.70  CSS pixels, a layout number
 * toPrintPixels(210, 'mm', 300)         // 2480.31 raster pixels at 300 DPI
 * ```
 *
 * `2480 x 3508` is A4 at 300 DPI, and it is exactly the pair that sat in this repo's
 * old `PRINT_TYPE` table - so that need was real; what was wrong was trying to
 * measure the number instead of being given it.
 *
 * **The result is not rounded.** A canvas needs an integer, but which way to round
 * is the caller's decision: `Math.ceil` so a page never loses its last pixel row,
 * `Math.round` for a photo, `Math.floor` when tiling. Rounding here would also make
 * a ratio of two results quietly wrong.
 *
 * @throws {TypeError} if `dpi` is not a positive finite number, or via
 *   `convertLength` for a non-finite value or an unknown unit.
 *
 * @example
 * ```ts
 * const canvas = document.createElement('canvas');
 * canvas.width = Math.ceil(toPrintPixels(210, 'mm', PRINT_DPI.offset));  // 2481
 * canvas.height = Math.ceil(toPrintPixels(297, 'mm', PRINT_DPI.offset)); // 3508
 *
 * toPrintPixels(4, 'in', 600);  // 2400
 * ```
 */
export function toPrintPixels(
  value: number,
  unit: LengthUnit,
  dpi: number
): number {
  assertDpi(dpi, 'toPrintPixels');

  return convertLength(value, unit, 'in') * dpi;
}

/**
 * Raster pixels back to a physical length, given the resolution they were made at.
 *
 * The inverse of `toPrintPixels` for the same `dpi`. Use it to answer "this scan is
 * 2480 pixels wide at 300 DPI - does it fit A4?".
 *
 * @throws {TypeError} if `dpi` is not a positive finite number, or via
 *   `convertLength` for a non-finite value or an unknown unit.
 *
 * @example
 * ```ts
 * fromPrintPixels(2480, 'mm', 300);  // 209.97, so it fits A4's 210mm
 * ```
 */
export function fromPrintPixels(
  pixels: number,
  unit: LengthUnit,
  dpi: number
): number {
  assertDpi(dpi, 'fromPrintPixels');
  if (typeof pixels !== 'number' || !Number.isFinite(pixels)) {
    throw new TypeError(
      `fromPrintPixels: expected a finite number of pixels, got ${pixels}`
    );
  }

  return convertLength(pixels / dpi, 'in', unit);
}

function assertDpi(dpi: number, caller: string): void {
  if (typeof dpi !== 'number' || !Number.isFinite(dpi) || dpi <= 0) {
    throw new TypeError(
      `${caller}: dpi must be a positive finite number, got ${dpi}`
    );
  }
}
