import { vietnameseDiacriticsRegex } from './patterns';

/**
 * Whether `value` contains at least one Vietnamese-specific diacritic letter.
 *
 * **Not** "is this Vietnamese text", which no character test can answer: Vietnamese
 * written without diacritics ("Xin chao") has none, and `à` is ordinary French. The
 * version this replaced was called `isVietnamese` and promised the thing it cannot
 * deliver. Use this to decide whether to normalise or transliterate, not to detect a
 * language.
 *
 * Matching is case-insensitive and covers the 67 precomposed letters Vietnamese adds
 * to the Latin alphabet, including `đ`. It does **not** match decomposed input:
 * `'a'` + U+0300 is two code points and is `false`. Normalise with
 * `value.normalize('NFC')` first if the source may be decomposed.
 *
 * Deterministic. The pattern carries no `g` flag; with one, `.test()` would advance
 * `lastIndex` on the shared RegExp and the same input would alternate.
 *
 * Never throws. A non-string is `false`.
 *
 * @example
 * ```ts
 * hasVietnameseDiacritics('Hòa');        // true
 * hasVietnameseDiacritics('Hoa');        // false
 * hasVietnameseDiacritics('Đèn');        // true
 * hasVietnameseDiacritics('déjà vu');    // true - `à` is in the set
 * ```
 */
export function hasVietnameseDiacritics(value: unknown): boolean {
  return typeof value === 'string' && vietnameseDiacriticsRegex.test(value);
}
