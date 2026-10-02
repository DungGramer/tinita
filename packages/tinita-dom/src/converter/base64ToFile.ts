import { blobToFile } from './blobToFile';

/**
 * Decode base64 into a named `File`.
 *
 * Takes the base64 payload, not a `data:` URL. The version this replaced took a
 * data URL, called it `base64`, and returned `null` when the media type was
 * missing - so a perfectly good payload with no type produced nothing.
 *
 * @param mimeType media type for the file. Empty by default.
 * @param lastModified epoch milliseconds, `0` by default. See `blobToFile`.
 *
 * @throws {TypeError} if `base64` is not valid base64.
 *
 * @example
 * ```ts
 * base64ToFile('aGk=', 'hi.txt', 'text/plain');
 * ```
 */
export function base64ToFile(
  base64: string,
  fileName: string,
  mimeType = '',
  lastModified = 0
): File {
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new TypeError(
      'base64ToFile: received a string that is not valid base64'
    );
  }

  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return blobToFile(
    new Blob([bytes as BlobPart], { type: mimeType }),
    fileName,
    lastModified
  );
}
