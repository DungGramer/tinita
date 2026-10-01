import { blobToBase64 } from './blobToBase64';

/**
 * Encode a `Blob` as a `data:` URL.
 *
 * A blob with no type produces `data:;base64,...`, which is what the spec says a
 * missing media type looks like. It is not defaulted to
 * `application/octet-stream`, because guessing a type the caller did not set is
 * how a file gets served as the wrong thing.
 *
 * @throws whatever `blob.arrayBuffer()` rejects with.
 *
 * @example
 * ```ts
 * await blobToDataUrl(new Blob(['hi'], { type: 'text/plain' }));
 * // 'data:text/plain;base64,aGk='
 * ```
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return `data:${blob.type};base64,${await blobToBase64(blob)}`;
}
