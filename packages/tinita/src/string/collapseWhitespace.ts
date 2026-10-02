import { assertString } from '../asserts/assertString';

/**
 * Collapse every run of whitespace to a single space.
 *
 * It **collapses**, it does not remove: `'a  b'` becomes `'a b'`, not `'ab'`. The
 * version this replaced was called `removeEmptySpace`, which said the opposite of
 * what it did.
 *
 * Tabs, newlines and Unicode spaces all count as whitespace (`\s`), and each run
 * becomes one ordinary space - so this also flattens multi-line text to one line.
 * Leading and trailing whitespace is collapsed to a single space, not trimmed; call
 * `.trim()` as well if that is wanted.
 *
 * Throws `TypeError` on a non-string.
 *
 * @example
 * ```ts
 * collapseWhitespace('a  b');        // 'a b'
 * collapseWhitespace('a\n\tb');      // 'a b'
 * collapseWhitespace('  a  ');       // ' a '
 * collapseWhitespace('  a  ').trim() // 'a'
 * ```
 */
export function collapseWhitespace(value: string): string {
  assertString(value, 'collapseWhitespace');

  return value.replace(/\s+/g, ' ');
}
