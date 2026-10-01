/**
 * Read a `Blob` into bytes.
 *
 * Takes `Blob` rather than `File` on purpose: `File extends Blob`, so this accepts
 * both, and `Blob` is the type that exists on every runtime. A `File` parameter
 * would make the function unusable on Node 18, where `File` is not a global.
 *
 * Uses `blob.arrayBuffer()` rather than `FileReader`. `FileReader` exists in no
 * version of Node, while `arrayBuffer()` has been on `Blob` since Node 18, so this
 * is the version that runs everywhere - and it is a tenth of the code.
 *
 * @throws whatever `blob.arrayBuffer()` rejects with; nothing is swallowed.
 *
 * @example
 * ```ts
 * const bytes = await blobToUint8Array(new Blob(['hi']));
 * // Uint8Array(2) [104, 105]
 * ```
 */
export async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}
