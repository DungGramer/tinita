import { sanitizeFilename } from './sanitize-filename';

/**
 * Lightweight RFC 6266 / RFC 5987 Content-Disposition filename parser.
 *
 * Supported patterns (in priority order):
 *  1. `filename*=UTF-8''percent%20encoded.pdf`  (RFC 5987 extended value)
 *  2. `filename="quoted name.pdf"`
 *  3. `filename=unquoted.pdf`
 *
 * Zero runtime dependencies. Only handles the `filename` / `filename*`
 * directives; other parameters (e.g. `size`, `creation-date`) are ignored.
 *
 * @param header - The raw value of the `Content-Disposition` response header.
 * @returns The decoded filename, or `null` if none could be extracted.
 *
 * @example
 * parseContentDisposition('attachment; filename="report.pdf"')
 * // => 'report.pdf'
 *
 * parseContentDisposition("attachment; filename*=UTF-8''My%20File.pdf")
 * // => 'My File.pdf'
 *
 * parseContentDisposition('attachment; filename=plain.txt')
 * // => 'plain.txt'
 *
 * parseContentDisposition('attachment')
 * // => null
 */

export function parseContentDisposition(header: string): string | null {
  if (!header) return null;

  // --- RFC 5987 extended value: filename*=UTF-8''percent-encoded ---
  // Matches: filename*=UTF-8''encoded%20name (case-insensitive charset)
  const extMatch = /filename\*\s*=\s*([A-Za-z0-9-]+)'[^']*'([^;\s]+)/i.exec(header);
  if (extMatch) {
    const charset = extMatch[1]?.toLowerCase() ?? 'utf-8';
    const encoded = extMatch[2] ?? '';
    if (charset === 'utf-8' || charset === 'utf8') {
      try {
        const decoded = decodeURIComponent(encoded);
        const sanitized = sanitizeFilename(decoded);
        if (sanitized) return sanitized;
      } catch {
        // fall through to other patterns
      }
    }
  }

  // --- Quoted filename: filename="name.pdf" ---
  const quotedMatch = /filename\s*=\s*"([^"\\]*(\\.[^"\\]*)*)"/i.exec(header);
  if (quotedMatch) {
    // Unescape backslash-escaped characters (e.g. \" inside quoted string)
    const unescaped = (quotedMatch[1] ?? '').replace(/\\(.)/g, '$1');
    const sanitized = sanitizeFilename(unescaped);
    if (sanitized) return sanitized;
  }

  // --- Unquoted filename: filename=plain.txt ---
  const plainMatch = /filename\s*=\s*([^;\s"]+)/i.exec(header);
  if (plainMatch) {
    const sanitized = sanitizeFilename(plainMatch[1] ?? '');
    if (sanitized) return sanitized;
  }

  return null;
}
