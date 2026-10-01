import { blobToUint8Array } from './blobToUint8Array';

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
  const bytes = await blobToUint8Array(blob);

  // Chunked rather than one spread: `String.fromCharCode(...bytes)` passes every
  // byte as an argument and blows the call stack somewhere around 100k on V8.
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }

  return btoa(binary);
}
