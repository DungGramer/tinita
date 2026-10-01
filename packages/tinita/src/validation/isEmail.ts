import { emailRegex } from './patterns';

/**
 * Whether `value` looks like an email address.
 *
 * Deliberately a shape check, not a deliverability check: the only way to know an
 * address exists is to send to it.
 *
 * An empty string is **not** an email. The version this replaced skipped the regex
 * for empty input and returned `true`, so `isEmail('')` reported valid.
 *
 * @example
 * ```ts
 * isEmail('a@b.co'); // true
 * isEmail('');       // false
 * isEmail('abc');    // false
 * ```
 */
export function isEmail(value: string): boolean {
  return (
    typeof value === 'string' && value.length > 0 && emailRegex.test(value)
  );
}
