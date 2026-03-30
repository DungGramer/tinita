import type { DownloadInput } from './types';

/**
 * The classified type of a download input value.
 *
 * - `'blob'`        — a plain Blob (not a File)
 * - `'file'`        — a File object (extends Blob)
 * - `'arraybuffer'` — an ArrayBuffer
 * - `'uint8array'`  — a Uint8Array
 * - `'response'`    — a Fetch API Response
 * - `'url-object'`  — a URL instance
 * - `'data-url'`    — a string starting with `data:`
 * - `'url-string'`  — a string starting with `http://`, `https://`, or `blob:`
 * - `'text'`        — any other string (treated as plain text)
 */
export type DetectedInputType =
  | 'blob'
  | 'file'
  | 'arraybuffer'
  | 'uint8array'
  | 'response'
  | 'url-object'
  | 'data-url'
  | 'url-string'
  | 'text';

/**
 * Detect the runtime type of a download input.
 *
 * File is checked before Blob because File extends Blob and `instanceof Blob`
 * would match both.
 *
 * @param input - The value to classify.
 * @returns A `DetectedInputType` string literal.
 *
 * @example
 * detectInputType(new File(['hi'], 'hi.txt'))  // => 'file'
 * detectInputType(new Blob(['hi']))             // => 'blob'
 * detectInputType(new ArrayBuffer(8))           // => 'arraybuffer'
 * detectInputType(new Uint8Array([1, 2]))       // => 'uint8array'
 * detectInputType(new URL('https://x.com'))     // => 'url-object'
 * detectInputType('data:text/plain;base64,aGk=') // => 'data-url'
 * detectInputType('https://example.com/a.pdf') // => 'url-string'
 * detectInputType('blob:http://localhost/abc')  // => 'url-string'
 * detectInputType('Hello, world!')              // => 'text'
 */
export function detectInputType(input: DownloadInput): DetectedInputType {
  // Check File before Blob — File extends Blob
  if (input instanceof File) return 'file';
  if (input instanceof Blob) return 'blob';
  if (input instanceof ArrayBuffer) return 'arraybuffer';
  if (input instanceof Uint8Array) return 'uint8array';
  if (typeof Response !== 'undefined' && input instanceof Response) return 'response';
  if (input instanceof URL) return 'url-object';

  if (typeof input === 'string') {
    if (input.startsWith('data:')) return 'data-url';
    if (
      input.startsWith('http://') ||
      input.startsWith('https://') ||
      input.startsWith('blob:')
    ) {
      return 'url-string';
    }
    return 'text';
  }

  // Exhaustive fallback — should never reach here with correct DownloadInput types
  return 'text';
}
