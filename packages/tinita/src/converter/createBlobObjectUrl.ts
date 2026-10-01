/**
 * A `blob:` URL pointing at `source`.
 *
 * **The caller owns the result and must release it** with `URL.revokeObjectURL`.
 * Until then the browser keeps the whole blob alive, so a forgotten URL is a leak
 * the size of the file. The name says `create` for that reason; the version this
 * replaced was called `blobToURL`, which read like a pure conversion.
 *
 * ```ts
 * const url = createBlobObjectUrl(file);
 * image.src = url;
 * image.onload = () => URL.revokeObjectURL(url);
 * ```
 *
 * Works on Node too. Measured 2026-10-01 with `docker run node:{18,20,22}-alpine`:
 * all three provide `URL.createObjectURL` and mint a real `blob:` URL (Node added it
 * in v16.7.0). On the server the URL is only readable through
 * `buffer.resolveObjectURL`, so it is rarely what a server wants - but it does not
 * throw, which is why this lives in `tinita` and not `tinita-dom`.
 *
 * @throws {TypeError} if `source` is not a `Blob` or `MediaSource`.
 */
export function createBlobObjectUrl(source: Blob | MediaSource): string {
  return URL.createObjectURL(source);
}
