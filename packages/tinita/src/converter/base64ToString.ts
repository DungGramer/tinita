import { assertString } from '../asserts/assertString';
import { base64ToBytes } from './base64ToBytes';

/**
 * Decode base64 into a string, via UTF-8. The inverse of `stringToBase64`.
 *
 * Invalid UTF-8 byte sequences decode to U+FFFD rather than throwing, matching
 * `TextDecoder`'s non-fatal default. Base64 that is not valid base64 *does*
 * throw - a malformed envelope is a caller error, malformed contents may not be.
 *
 * @throws {TypeError} if the input is not a string, is base64url, or is not valid
 *   base64. The version this replaced let `atob`'s `DOMException` escape
 *   undocumented.
 *
 * @example
 * ```ts
 * base64ToString('aGk=');                     // 'hi'
 * base64ToString('SMOybSBuaOSpyB0csOhaQ==');  // 'Hòm nhĩ trái'
 * ```
 */
export function base64ToString(base64: string): string {
  assertString(base64, 'base64ToString', 'base64');

  return new TextDecoder().decode(base64ToBytes(base64));
}
