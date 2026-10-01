import { asciiLettersRegex } from './patterns';

/**
 * Whether `value` is one or more ASCII letters (`A-Z`, `a-z`) and nothing else.
 *
 * **Not** "is alphabetic". `'Đèn'`, `'日本'` and `'café'` are all `false`, because
 * the pattern is `[a-zA-Z]`. The version this replaced was called `isAlphabet`,
 * which reads as a claim about any alphabet - a bad claim to make in a package that
 * ships Vietnamese helpers next door. For letters in any script, use
 * `/^\p{L}+$/u`.
 *
 * Never throws. A non-string is `false`.
 *
 * @example
 * ```ts
 * isAsciiLetters('abc');  // true
 * isAsciiLetters('a1');   // false
 * isAsciiLetters('Đèn');  // false - letters, but not ASCII
 * isAsciiLetters('');     // false
 * ```
 */
export function isAsciiLetters(value: unknown): boolean {
  return typeof value === 'string' && asciiLettersRegex.test(value);
}
