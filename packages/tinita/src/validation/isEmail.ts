import { emailRegex } from './patterns';

/**
 * Whether `value` has the shape of an email address.
 *
 * Deliberately a shape check, not a deliverability check: the only way to know an
 * address exists is to send to it. Use this to catch typing mistakes in a form, and
 * never as the gate on anything that matters.
 *
 * It is also deliberately not RFC 5322. That grammar permits quoted local parts and
 * comments (`"a b"(note)@example.com`), which no signup form wants to accept. What
 * this accepts: a local part of letters, digits and `. _ % + -`, an `@`, a domain,
 * and a dot-separated TLD of two or more characters.
 *
 * An empty string is **not** an email. The version this replaced skipped the regex
 * for empty input and returned `true`.
 *
 * The TLD bound is `{2,}`. The version this replaced used `{2,4}` and so rejected
 * `.museum`, `.online` and `.technology` - measured 2026-10-01.
 *
 * Never throws. A non-string is `false`.
 *
 * @example
 * ```ts
 * isEmail('a@b.co');            // true
 * isEmail('a@b.technology');    // true
 * isEmail('');                  // false
 * isEmail('abc');               // false
 * ```
 */
export function isEmail(value: unknown): boolean {
  return typeof value === 'string' && emailRegex.test(value);
}
