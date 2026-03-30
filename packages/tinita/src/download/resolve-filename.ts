import type { DownloadInput } from './types';
import { DEFAULT_FILENAME } from './constants';
import { detectInputType } from './detect-input-type';
import { parseContentDisposition } from './parse-content-disposition';
import { sanitizeFilename } from './sanitize-filename';

/**
 * Options for {@link resolveFilename}.
 */
export interface ResolveFilenameOptions {
  /**
   * Explicit filename to use. When provided it takes highest priority and
   * no further detection is performed.
   */
  filename?: string;
  /**
   * A `Response` object whose `Content-Disposition` header may contain a
   * filename. Checked after `File.name` but before URL-based inference.
   */
  response?: Response;
  /**
   * A raw `Content-Disposition` header string (e.g. from `xhr.getResponseHeader`).
   * Checked after `File.name` and before `response`. Useful for XHR callers
   * that have no `Response` object.
   */
  contentDisposition?: string;
}

/**
 * Infer a download filename from the input using the following priority chain:
 *
 * 1. `options.filename` — explicit override, returned immediately
 * 2. `input instanceof File` — uses `File.name`
 * 2.5. `options.contentDisposition` — raw Content-Disposition string (XHR callers)
 * 3. `options.response` — parses the `Content-Disposition` header (fetch callers)
 * 4. URL input (string or URL object) — extracts the last path segment
 * 5. `DEFAULT_FILENAME` — fallback constant
 *
 * The resolved name is always sanitized: path separators are stripped,
 * leading/trailing whitespace is trimmed, and the length is capped at 255
 * characters.
 *
 * @param input - The download input value.
 * @param options - Optional overrides and response object.
 * @returns A non-empty, sanitized filename string.
 *
 * @example
 * // Explicit filename wins
 * resolveFilename(new Blob(['x']), { filename: 'custom.txt' })
 * // => 'custom.txt'
 *
 * @example
 * // File.name
 * resolveFilename(new File(['x'], 'photo.jpg'))
 * // => 'photo.jpg'
 *
 * @example
 * // Content-Disposition header
 * const res = new Response('', {
 *   headers: { 'Content-Disposition': 'attachment; filename="report.pdf"' }
 * });
 * resolveFilename(new Blob([]), { response: res })
 * // => 'report.pdf'
 *
 * @example
 * // URL pathname extraction
 * resolveFilename('https://cdn.example.com/assets/image.png')
 * // => 'image.png'
 *
 * @example
 * // Fallback
 * resolveFilename('Hello world')
 * // => 'download'
 */
export function resolveFilename(
  input: DownloadInput,
  options: ResolveFilenameOptions = {},
): string {
  // 1. Explicit override
  if (options.filename) {
    const sanitized = sanitizeFilename(options.filename);
    if (sanitized) return sanitized;
  }

  // 2. File.name
  if (input instanceof File && input.name) {
    const sanitized = sanitizeFilename(input.name);
    if (sanitized) return sanitized;
  }

  // 2.5 Raw Content-Disposition string (for XHR callers)
  if (options.contentDisposition) {
    const parsed = parseContentDisposition(options.contentDisposition);
    if (parsed) return parsed;
  }

  // 3. Content-Disposition from response
  if (options.response) {
    const cd = options.response.headers.get('content-disposition');
    if (cd) {
      const parsed = parseContentDisposition(cd);
      if (parsed) return parsed; // parseContentDisposition already sanitizes
    }
  }

  // 4. URL pathname
  const detected = detectInputType(input);
  if (detected === 'url-string' || detected === 'url-object') {
    const urlString = input instanceof URL ? input.href : (input as string);
    const filename = extractFilenameFromUrl(urlString);
    if (filename) return filename;
  }

  // 5. Fallback
  return DEFAULT_FILENAME;
}

/**
 * Extract the last non-empty path segment from a URL string as a potential
 * filename. Query strings and hash fragments are stripped.
 */
function extractFilenameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // pathname ends with '/' on directory-style URLs — segments will have an empty last part
    const segments = parsed.pathname.split('/');
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i];
      if (segment) {
        return sanitizeFilename(decodeURIComponent(segment));
      }
    }
  } catch {
    // URL parse failed — try a simple string split as last resort
    const noQuery = url.split('?')[0]?.split('#')[0] ?? '';
    const parts = noQuery.split('/');
    const last = parts[parts.length - 1];
    if (last) return sanitizeFilename(last);
  }
  return null;
}
