import { base64ToBlob } from './base64ToBlob';

/**
 * Decode a base64 `data:` URL into a `Blob`, media type included.
 *
 * The inverse of `blobToDataUrl`.
 *
 * Only base64 data URLs are accepted. The percent-encoded form
 * (`data:text/plain,hi`) is a different encoding and silently treating it as
 * base64 would produce a blob full of wrong bytes, so it is rejected instead.
 *
 * @throws {TypeError} if the input is not a base64 `data:` URL, or if its payload
 *   is not valid base64.
 *
 * @example
 * ```ts
 * dataUrlToBlob('data:text/plain;base64,aGk=');
 * // Blob { size: 2, type: 'text/plain' }
 * ```
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  // Media type may carry parameters (`;charset=utf-8`), so everything between
  // `data:` and the final `;base64,` is the type.
  const match = /^data:([^,]*?);base64,(.*)$/s.exec(dataUrl);
  if (!match) {
    throw new TypeError(
      'dataUrlToBlob: expects a base64 data URL, e.g. "data:text/plain;base64,aGk="'
    );
  }

  return base64ToBlob(match[2] as string, match[1] as string);
}
