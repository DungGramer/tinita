import { assertNonEmptyString } from 'tinita/asserts/assertNonEmptyString';
import { assertString } from 'tinita/asserts/assertString';

export interface CookieOptions {
  /**
   * Lifetime in seconds. Omit for a session cookie, which the browser drops when it
   * closes.
   *
   * `Max-Age` rather than `Expires`: it needs no date formatting and is immune to a
   * wrong clock on the device.
   */
  maxAge?: number;
  /**
   * `'/'` by default, so the cookie is readable everywhere on the origin.
   *
   * This is a correctness default, not a convenience one. The version this replaced
   * set no path, so the browser scoped the cookie to the **current directory**: a
   * cookie written on `/app/settings` was invisible on `/`, and the symptom was a
   * value that "did not save".
   */
  path?: string;
  /** Leave unset for host-only, which is the safer default. */
  domain?: string;
  /**
   * `'Lax'` by default.
   *
   * Browsers treat a cookie with no `SameSite` as `Lax` anyway and warn in the
   * console; saying it explicitly removes the warning and documents the intent.
   * `'None'` additionally requires `secure: true` or the browser rejects the cookie.
   */
  sameSite?: 'Strict' | 'Lax' | 'None';
  /**
   * Defaults to `true` on an `https:` page and `false` otherwise, so local
   * development over `http:` keeps working without a flag.
   */
  secure?: boolean;
}

const encode = encodeURIComponent;

/**
 * `document.cookie`, with the escaping and the attributes that make it behave.
 *
 * Replaces `cookieStorageAction`, which had four measured defects, three of them
 * data-destroying:
 *
 * ```
 * set()    no encodeURIComponent  a value containing ';' or '=' corrupted the
 *                                 whole cookie jar
 * set()    no path                written on /a/b, invisible on /
 * set()    no SameSite            browsers warn
 * clear()  wrote `expire=`        the attribute is `expires=`, so clear() quietly
 *                                 deleted NOTHING while appearing to succeed
 * get()    split('=') once        a value containing '=' lost everything after it
 * ```
 *
 * There is deliberately **no `clear()`**. It cannot be done honestly from
 * JavaScript: `HttpOnly` cookies are invisible, and a cookie set on a different
 * `path` or `domain` cannot be deleted without knowing that exact pair. A `clear()`
 * that removes some cookies and silently leaves others is worse than none. Use
 * `remove` per name, or `entries()` to see what is visible.
 *
 * No `HttpOnly` option either: JavaScript cannot set it, and an option the browser
 * ignores is worse than no option.
 *
 * Cookies travel with **every** request to the origin, so they cost bandwidth and
 * are visible to the server. For data the client alone needs, `sessionStorageJson`
 * or `localStorageJson` is the right place.
 */
export const cookieJar = {
  /**
   * The value for `name`, or `null` when no such cookie is visible.
   *
   * `null` means absent; `''` means present and empty - the version this replaced
   * returned `''` for both. Values are percent-decoded, matching `set`.
   */
  get(name: string): string | null {
    assertString(name, 'cookieJar.get', 'name');

    const target = encode(name);
    for (const pair of document.cookie.split(';')) {
      const index = pair.indexOf('=');
      if (index === -1) continue;
      // Split on the FIRST '=' only: base64 values end in '=' and the version this
      // replaced truncated them.
      if (pair.slice(0, index).trim() !== target) continue;

      try {
        return decodeURIComponent(pair.slice(index + 1).trim());
      } catch {
        // A value not written by `set` may not be valid percent-encoding. Hand back
        // the raw text rather than throwing on someone else's cookie.
        return pair.slice(index + 1).trim();
      }
    }

    return null;
  },

  /**
   * Write a cookie.
   *
   * Both name and value are percent-encoded, so any string is safe to store -
   * including one containing `;`, `=` or a newline, each of which would otherwise
   * inject an attribute or truncate the jar.
   *
   * @throws {TypeError} if `name` is empty, or if `sameSite: 'None'` is used without
   *   `secure`, which every current browser rejects outright.
   */
  set(name: string, value: string, options: CookieOptions = {}): void {
    assertNonEmptyString(name, 'cookieJar.set', 'name');

    const {
      maxAge,
      path = '/',
      domain,
      sameSite = 'Lax',
      secure = typeof location !== 'undefined' &&
        location.protocol === 'https:',
    } = options;

    if (sameSite === 'None' && !secure) {
      throw new TypeError(
        "cookieJar.set: sameSite 'None' requires secure: true - browsers reject the cookie otherwise"
      );
    }

    const parts = [
      `${encode(name)}=${encode(value)}`,
      `Path=${path}`,
      `SameSite=${sameSite}`,
    ];
    if (maxAge !== undefined) {
      // Was unvalidated, and the failure was silent AND load-bearing: Math.floor(NaN)
      // is NaN, so `Max-Age=NaN` is an attribute no browser can parse, and the whole
      // cookie is dropped. `set` returns void, so a session or CSRF cookie simply
      // never got written and nothing said so.
      //
      // TypeError, not RangeError: there is no upper bound to be outside of - how long
      // a cookie lives is the caller's business. The invariant is only
      // "non-negative integer of seconds". 0 is valid and means "expire now".
      // assert-reuse-ignore một consumer duy nhất, nên không extract (§19)
      if (!Number.isInteger(maxAge) || maxAge < 0) {
        throw new TypeError(
          `cookieJar.set: maxAge must be a non-negative integer of seconds, got ${maxAge}`
        );
      }
      parts.push(`Max-Age=${maxAge}`);
    }
    if (domain) parts.push(`Domain=${domain}`);
    if (secure) parts.push('Secure');

    document.cookie = parts.join('; ');
  },

  /**
   * Delete a cookie.
   *
   * `path` and `domain` must match what `set` used, or the browser deletes nothing -
   * that is how cookies work, not a limitation here. The defaults match `set`'s
   * defaults, so a cookie written with this module is removed by name alone.
   */
  remove(
    name: string,
    options: Pick<CookieOptions, 'path' | 'domain'> = {}
  ): void {
    assertNonEmptyString(name, 'cookieJar.remove', 'name');

    const { path = '/', domain } = options;
    const parts = [`${encode(name)}=`, `Path=${path}`, 'Max-Age=0'];
    if (domain) parts.push(`Domain=${domain}`);

    document.cookie = parts.join('; ');
  },

  /**
   * Every cookie JavaScript can see, as `[name, value]` pairs, decoded.
   *
   * `HttpOnly` cookies are **not** here, by design of the browser. So this is "what
   * this page can read", not "what the browser will send".
   */
  entries(): [string, string][] {
    const result: [string, string][] = [];
    for (const pair of document.cookie.split(';')) {
      const index = pair.indexOf('=');
      if (index === -1) continue;
      const rawName = pair.slice(0, index).trim();
      if (rawName === '') continue;
      const rawValue = pair.slice(index + 1).trim();
      try {
        result.push([
          decodeURIComponent(rawName),
          decodeURIComponent(rawValue),
        ]);
      } catch {
        result.push([rawName, rawValue]);
      }
    }

    return result;
  },
};
