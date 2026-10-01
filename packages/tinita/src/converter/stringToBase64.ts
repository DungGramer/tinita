import { bytesToBase64 } from './bytesToBase64';

/**
 * Encode a string as base64, via UTF-8.
 *
 * `btoa` alone cannot do this: it takes one byte per character and throws on
 * anything above U+00FF, so `btoa('ĩ')` is an error while `btoa('ò')` is not -
 * U+00F2 is still inside Latin-1. Encoding to UTF-8 first is what makes any
 * string work.
 *
 * **Lone surrogates do not survive.** `TextEncoder` replaces an unpaired
 * surrogate with U+FFFD, so `base64ToString(stringToBase64('\uD800'))` gives
 * `'�'`, not the input. That is UTF-8's rule, not a choice made here, and
 * hiding it would be the dishonest option. For every well-formed string - and
 * every string you get from a file, a network response, or a user typing - the
 * round-trip is exact.
 *
 * @throws {TypeError} if `input` is not a string. Never throws for a string.
 *
 * @example
 * ```ts
 * stringToBase64('hi');           // 'aGk='
 * stringToBase64('Hòm nhĩ trái'); // 'SMOybSBuaOSpyB0csOhaQ=='
 * ```
 */
export function stringToBase64(input: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(
      `stringToBase64() expects a string, received ${typeof input}`
    );
  }

  return bytesToBase64(new TextEncoder().encode(input));
}
