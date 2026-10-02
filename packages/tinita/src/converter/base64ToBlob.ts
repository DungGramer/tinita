import { assertString } from '../asserts/assertString';
import { base64ToBytes } from './base64ToBytes';

/**
 * Decode base64 into a `Blob`.
 *
 * The inverse of `blobToBase64`, and the pair holds a round-trip invariant: for
 * any blob, `base64ToBlob(await blobToBase64(b), b.type)` carries the same bytes
 * and the same type.
 *
 * Takes the payload only. Pass a whole `data:` URL to `dataUrlToBlob` instead.
 *
 * @param type media type for the resulting blob. Empty by default, matching what
 *   `new Blob([...])` does when no type is given.
 *
 * @throws {TypeError} if `base64` is not valid base64. The version this replaced
 *   returned `null` on failure, which pushed a null check onto every call site and
 *   let a typo look like an empty file.
 *
 * @example
 * ```ts
 * base64ToBlob('aGk=', 'text/plain'); // Blob { size: 2, type: 'text/plain' }
 * ```
 */
export function base64ToBlob(base64: string, type = ''): Blob {
  assertString(base64, 'base64ToBlob', 'base64');

  return new Blob([base64ToBytes(base64) as BlobPart], { type });
}
