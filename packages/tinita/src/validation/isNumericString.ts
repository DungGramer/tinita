import { digitsRegex } from './patterns';

/**
 * Whether `value` is a string of ASCII digits and nothing else.
 *
 * **Not** "is a number". No sign, no decimal point, no exponent, no whitespace,
 * no grouping separators: `'-1'`, `'1.5'`, `'1e3'` and `' 1'` are all `false`.
 * The name says `NumericString` for that reason - the version this replaced was
 * called `isNumber` and returned `false` for `'1.5'`, which no caller expects.
 *
 * Use it for digit-only fields: an OTP, a numeric id typed by a user, a zip code.
 * For "can this be parsed as a number", use `Number.isFinite(Number(value))`.
 *
 * Never throws. A non-string is `false`, not a coercion: the previous version
 * passed its argument straight to `RegExp.test`, so `isNumber(12)` was `true`
 * through `String(12)`.
 *
 * @example
 * ```ts
 * isNumericString('42');   // true
 * isNumericString('');     // false - no digits is not a digit string
 * isNumericString('1.5');  // false
 * isNumericString(42);     // false - not a string
 * ```
 */
export function isNumericString(value: unknown): boolean {
  return typeof value === 'string' && digitsRegex.test(value);
}
