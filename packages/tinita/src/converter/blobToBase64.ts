import { blobToUint8Array } from './blobToUint8Array';
import { bytesToBase64 } from './bytesToBase64';

/**
 * Encode a `Blob` as base64.
 *
 * Returns the base64 payload **only**. For `data:<type>;base64,<payload>` use
 * `blobToDataUrl`. The version this replaced was named `blobToBase64` but called
 * `readAsDataURL`, so it returned the prefixed form - a name that did not describe
 * its result.
 *
 * Accepts `File` too, since `File extends Blob`.
 *
 * @throws whatever `blob.arrayBuffer()` rejects with.
 *
 * @example
 * ```ts
 * await blobToBase64(new Blob(['hi'])); // 'aGk='
 * ```
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return bytesToBase64(await blobToUint8Array(blob));
}
