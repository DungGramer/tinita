/**
 * Whether `value` parses as an absolute URL.
 *
 * **A scheme is required.** `'a.com'` is `false`, because a string with no scheme
 * is not a URL - and a pattern loose enough to accept `a.com` accepts far more than
 * the caller means.
 *
 * **This is not a safety check.** `isUrl('javascript:alert(1)')` is `true`: that is
 * a syntactically valid URL. Never use this to decide whether to navigate to, fetch,
 * or render something. For that, parse it and compare `protocol` against a list you
 * allow.
 *
 * Replaces a hand-built 6-line regex. Measured 2026-10-01, that regex returned
 * `false` for `'https://localhost:3000'` - the most common development URL there is -
 * and `false` for a path with non-ASCII characters, while returning `true` for
 * `'999.999.999.999'`.
 *
 * Never throws.
 *
 * @example
 * ```ts
 * isUrl('https://localhost:3000');  // true
 * isUrl('a.com');                   // false - no scheme
 * isUrl('javascript:alert(1)');     // true - valid URL, NOT safe to navigate to
 * isUrl('');                        // false
 * ```
 */
export function isUrl(value: unknown): boolean {
  // assert-reuse-ignore predicate: hợp đồng là trả boolean, không ném. assertString
  // ở đây sẽ biến `isUrl(42)` từ `false` thành một throw.
  if (typeof value !== 'string') return false;

  // `URL.canParse` landed in Node 18.17; `engines` allows 18.0.0, so fall back.
  if (typeof URL.canParse === 'function') return URL.canParse(value);

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
