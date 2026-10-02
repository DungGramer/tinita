import { assertString } from '../asserts/assertString';
/**
 * Decode base64 into bytes. The inverse of `bytesToBase64`.
 *
 * Padding is optional, because `atob` accepts both `aGk` and `aGk=`.
 *
 * The URL-safe alphabet (`-` and `_`) is **rejected** rather than quietly
 * accepted. Accepting both alphabets would make this no longer the exact inverse
 * of `bytesToBase64`, which emits only one of them, and a round-trip that holds
 * in one direction only is worse than one that refuses.
 *
 * @throws {TypeError} if the input is not a string, or not valid base64. `atob`
 *   itself throws `DOMException`, which is neither catchable by type in Node nor
 *   meaningful to a caller of this function.
 *
 * @example
 * ```ts
 * base64ToBytes('aGk='); // Uint8Array(2) [104, 105]
 * ```
 */
export function base64ToBytes(base64: string): Uint8Array {
  assertString(base64, 'base64ToBytes', 'base64');

  if (/[-_]/.test(base64)) {
    throw new TypeError(
      'base64ToBytes: received base64url. Convert it first: ' +
        "base64.replace(/-/g, '+').replace(/_/g, '/')"
    );
  }

  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new TypeError(
      'base64ToBytes: received a string that is not valid base64'
    );
  }

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
