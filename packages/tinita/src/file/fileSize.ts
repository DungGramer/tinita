import { assertFiniteNumber } from '../asserts/assertFiniteNumber';

/**
 * Convert file size to human readable format
 * Base 10: 1 KB = 1000 Bytes
 * Base 2: 1 KB = 1024 Bytes
 *
 * @param size - File size in bytes
 * @param base - Base for conversion (1000 or 1024, default: 1000)
 * @returns Human-readable file size string
 *
 * @example
 * fileSize(1024) // => "1.02 KB"
 * fileSize(1024, 1024) // => "1 KB"
 * fileSize(0) // => "0 Byte"
 *
 * Every rejected input below used to return the string `"NaN undefined"`, which looks
 * like a value and renders straight into a UI: `Math.log` of a negative is `NaN`, and
 * `sizes[NaN]` is `undefined`. Measured on `-5`, `NaN`, `Infinity`, `'x'` and `null`.
 * A `base` outside the documented pair did the same - `fileSize(1024, 2)` returned
 * `"1 undefined"` because index 10 is past the end of the unit list.
 *
 * `TypeError` for a negative size, not `RangeError`: a byte count has no upper bound,
 * so non-negativity is a value contract rather than an interval. Same reading as
 * `assertPositiveFiniteNumber`.
 *
 * @throws {TypeError} if `size` is not a finite number, if `size` is negative, or if
 * `base` is neither 1000 nor 1024.
 */
export function fileSize(size: number, base: 1000 | 1024 = 1000): string {
  assertFiniteNumber(size, 'fileSize', 'size');

  if (size < 0) {
    throw new TypeError(`fileSize: size must not be negative, got ${size}`);
  }
  if (base !== 1000 && base !== 1024) {
    throw new TypeError(`fileSize: base must be 1000 or 1024, got ${base}`);
  }

  if (size === 0) return '0 Byte';
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const indexBySize = Math.floor(Math.log(size) / Math.log(base));

  return `${Number.parseFloat((size / base ** indexBySize).toFixed(2))} ${sizes[indexBySize]}`;
}
