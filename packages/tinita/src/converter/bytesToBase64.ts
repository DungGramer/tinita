/**
 * Encode bytes as base64.
 *
 * The shared core of `stringToBase64` and `blobToBase64`, exported in its own
 * right because "I have bytes, I want base64" is the common case underneath both.
 *
 * Output is standard base64 with `+`, `/` and padding. For the URL-safe alphabet,
 * post-process: `.replace(/\+/g, '-').replace(/\//g, '_')`.
 *
 * @throws {TypeError} if `bytes` is not a `Uint8Array`.
 *
 * @example
 * ```ts
 * bytesToBase64(new Uint8Array([104, 105])); // 'aGk='
 * ```
 */
export function bytesToBase64(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError(
      `bytesToBase64() expects a Uint8Array, received ${typeof bytes}`
    );
  }

  // Chunked rather than `String.fromCharCode(...bytes)`, which passes every byte
  // as a separate argument and overflows the call stack somewhere around 100k.
  // Chunking is also faster than appending one byte at a time: measured on 5MB,
  // 405ms against 751ms.
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }

  return btoa(binary);
}
