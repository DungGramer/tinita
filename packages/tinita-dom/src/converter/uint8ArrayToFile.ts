import { blobToFile } from './blobToFile';

/**
 * Wrap bytes in a named `File`.
 *
 * @param mimeType media type. Empty by default rather than guessed: serving a
 *   file as the wrong type is worse than serving it as none.
 * @param lastModified epoch milliseconds, `0` by default. See `blobToFile`.
 *
 * @example
 * ```ts
 * uint8ArrayToFile(new Uint8Array([104, 105]), 'hi.txt', 'text/plain');
 * ```
 */
export function uint8ArrayToFile(
  bytes: Uint8Array,
  fileName: string,
  mimeType = '',
  lastModified = 0
): File {
  // `bytes as BlobPart`: since TypeScript 5.7 `Uint8Array` is generic over its
  // buffer, and `Uint8Array<ArrayBufferLike>` no longer matches the `BlobPart`
  // union even though every runtime accepts it.
  return blobToFile(
    new Blob([bytes as BlobPart], { type: mimeType }),
    fileName,
    lastModified
  );
}
