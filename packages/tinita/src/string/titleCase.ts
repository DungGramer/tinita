import { assertString } from '../asserts/assertString';

export interface TitleCaseOptions {
  /**
   * Lowercase everything after each word's first character. `false` by default.
   *
   * The version this replaced lowercased unconditionally, which destroyed casing the
   * caller meant. Measured 2026-10-01:
   *
   * ```
   * 'iPhone SDK'     ->  'Iphone Sdk'
   * 'HTML and CSS'   ->  'Html And Css'
   * 'McDonald'       ->  'Mcdonald'
   * ```
   */
  lowercaseRest?: boolean;
}

/**
 * Uppercase the first character of each word.
 *
 * A word boundary is a run of whitespace or hyphens, so `'mary-jane'` becomes
 * `'Mary-Jane'`. Separators are preserved exactly, runs included: `'a  b'` keeps
 * both spaces.
 *
 * Case conversion is locale-independent (`toUpperCase`, not
 * `toLocaleUpperCase`), so the result is the same on every machine. The
 * consequence is Turkish: `'istanbul'` becomes `'Istanbul'`, not `'İstanbul'`.
 *
 * Characters without case pass through, so a leading emoji or digit is untouched
 * and the rest of that word is **not** promoted - `'1st place'` stays `'1st Place'`.
 *
 * The first character of every word **is** uppercased - that is what title case
 * means - so `'iPhone'` becomes `'IPhone'`. What `lowercaseRest: false` preserves is
 * everything after it: `'SDK'` stays `'SDK'`, where the version this replaced gave
 * `'Sdk'`.
 *
 * Returns `''` for an empty string. Throws `TypeError` on a non-string.
 *
 * @example
 * ```ts
 * titleCase('hello world');                            // 'Hello World'
 * titleCase('iPhone SDK');                             // 'IPhone SDK'
 * titleCase('mary-jane watson');                       // 'Mary-Jane Watson'
 * titleCase('HELLO WORLD', { lowercaseRest: true });   // 'Hello World'
 * ```
 */
export function titleCase(
  value: string,
  options: TitleCaseOptions = {}
): string {
  assertString(value, 'titleCase');
  if (value === '') return '';

  const { lowercaseRest = false } = options;

  // Split keeping separators, so runs of whitespace survive byte for byte.
  return value
    .split(/([\s-]+)/)
    .map((part, index) => {
      if (index % 2 === 1) return part; // a separator run
      if (part === '') return part;
      const [first, ...rest] = part;
      const tail = rest.join('');

      return first.toUpperCase() + (lowercaseRest ? tail.toLowerCase() : tail);
    })
    .join('');
}
