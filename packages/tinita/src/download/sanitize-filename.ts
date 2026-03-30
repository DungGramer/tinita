import { DEFAULT_FILENAME } from './constants';

/**
 * Options for {@link sanitizeFilename}.
 */
export interface SanitizeFilenameOptions {
  /**
   * Maximum length in characters.
   * When the name exceeds this limit the stem is truncated while preserving
   * the extension (if it is <= 20 chars).
   * @default 255
   */
  maxLength?: number;
  /**
   * Replacement string for every stripped invalid character.
   * @default '' (strip silently)
   */
  replacement?: string;
  /**
   * Value returned when the sanitized result is empty.
   * @default 'download'
   */
  fallback?: string;
}

/**
 * Sanitize a filename so it is safe to use on Windows, macOS, and Linux.
 *
 * Operations applied (in order):
 * 1. Strip path-traversal sequences (`../`, `..\`) and leading path separators.
 * 2. Replace OS-invalid characters (`< > : " | ? * \0` and control chars 0x00-0x1F).
 * 3. Strip trailing dots and spaces (Windows restriction).
 * 4. Trim surrounding whitespace.
 * 5. Truncate to `maxLength`, preserving the file extension when possible.
 * 6. Return `fallback` when the result is empty.
 *
 * @param name - Raw filename string (may contain path separators or invalid chars).
 * @param options - Sanitization options.
 * @returns A safe filename string.
 *
 * @example
 * sanitizeFilename('../../../etc/passwd')          // => 'etcpasswd'
 * sanitizeFilename('my file <name>.txt')           // => 'my file name.txt'
 * sanitizeFilename('')                             // => 'download'
 * sanitizeFilename('a'.repeat(300) + '.txt')       // => 251-char stem + '.txt' (255 total)
 * sanitizeFilename('CON.txt')                      // => 'CON.txt'  (reserved names kept)
 */
export function sanitizeFilename(
  name: string,
  options: SanitizeFilenameOptions = {},
): string {
  const maxLength = options.maxLength ?? 255;
  const replacement = options.replacement ?? '';
  const fallback = options.fallback ?? DEFAULT_FILENAME;

  // 1. Strip path traversal sequences and leading separators.
  //    Remove any occurrence of ../ or ..\ (with or without preceding slash).
  let safe = name
    .replace(/(\.\.[/\\])+/g, replacement)
    .replace(/^[/\\]+/, '');

  // 2. Replace OS-invalid characters: < > : " | ? * NUL and control chars 0x00-0x1F.
  // eslint-disable-next-line no-control-regex
  safe = safe.replace(/[<>:"|?*\x00-\x1F]/g, replacement);

  // Also strip backslashes and forward slashes that remain (path separators).
  safe = safe.replace(/[/\\]/g, replacement);

  // 3. Strip trailing dots and spaces (Windows rejects them).
  safe = safe.replace(/[. ]+$/, '');

  // 4. Trim surrounding whitespace.
  safe = safe.trim();

  // 5. Truncate to maxLength while preserving extension.
  if (safe.length > maxLength) {
    const dotIndex = safe.lastIndexOf('.');
    const hasExt = dotIndex > 0 && safe.length - dotIndex - 1 <= 20;

    if (hasExt) {
      const ext = safe.slice(dotIndex); // e.g. '.txt'
      const stemMax = maxLength - ext.length;
      safe = stemMax > 0 ? safe.slice(0, stemMax) + ext : safe.slice(0, maxLength);
    } else {
      safe = safe.slice(0, maxLength);
    }
  }

  // 6. Return fallback if nothing remains.
  return safe.length > 0 ? safe : fallback;
}
