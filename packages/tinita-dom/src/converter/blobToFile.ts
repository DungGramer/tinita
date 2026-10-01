/**
 * Wrap a `Blob` in a `File` so it carries a name.
 *
 * Lives in `tinita-dom` rather than `tinita` because `File` is not a global on
 * Node 18, which `tinita` still supports. A browser always has one.
 *
 * @param lastModified epoch milliseconds. Defaults to `0`, **not** `Date.now()`:
 *   the `File` constructor's own default makes two calls with identical arguments
 *   produce different objects, which is a surprising thing for a converter to do
 *   and impossible to assert on.
 *
 * @example
 * ```ts
 * blobToFile(new Blob(['hi'], { type: 'text/plain' }), 'greeting.txt');
 * // File { name: 'greeting.txt', type: 'text/plain', lastModified: 0 }
 * ```
 */
export function blobToFile(
  blob: Blob,
  fileName: string,
  lastModified = 0
): File {
  return new File([blob], fileName, { type: blob.type, lastModified });
}
