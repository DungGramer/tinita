import {
  truncateFileNameParts,
  type TruncateFileNameConfig,
} from './truncateFileNameParts';

export type { TruncateFileNameConfig };

/**
 * Truncate a file name while preserving its extension and, when there is room,
 * a minimum prefix and a suffix of the original name.
 *
 * Returns a single string. Use `truncateFileNameParts` from
 * `tinita/file/truncateFileNameParts` when each piece has to be rendered
 * separately, or when you need to know whether anything was dropped.
 *
 * Available length is allocated in this order: extension, minimum prefix,
 * ellipsis, preserved suffix.
 *
 * The result never exceeds `maxLength`. It may come out one code unit shorter
 * when the cut would otherwise split a surrogate pair.
 *
 * @param fileName - Full file name, optionally including an extension
 * @param config - Truncation configuration
 * @returns The truncated file name
 *
 * @example
 * // Already fits: returned unchanged.
 * truncateFileName('document.pdf');
 * // => 'document.pdf'
 *
 * @example
 * // 27 characters, under the default maxLength of 30, so nothing is cut.
 * truncateFileName('very-long-document-name.pdf');
 * // => 'very-long-document-name.pdf'
 *
 * @example
 * // Keeps the extension and the last 3 characters of the name.
 * truncateFileName('very-long-document-name.pdf', { maxLength: 20 });
 * // => 'very-long-...ame.pdf'
 *
 * @example
 * // Keep 5 characters from the end of the name.
 * truncateFileName('very-long-document-name.pdf', {
 *   maxLength: 24,
 *   preservedSuffixLength: 5,
 * });
 * // => 'very-long-do...-name.pdf'
 *
 * @example
 * // Single-character ellipsis leaves more room for the name.
 * truncateFileName('very-long-document-name.pdf', {
 *   maxLength: 20,
 *   ellipsis: '…',
 * });
 * // => 'very-long-do…ame.pdf'
 *
 * @example
 * // A suffix longer than the available space is reduced automatically.
 * truncateFileName('very-long-document-name.pdf', {
 *   maxLength: 20,
 *   preservedSuffixLength: 20,
 * });
 * // => 'v...ocument-name.pdf'
 *
 * @example
 * // No room for minPrefixLength plus the ellipsis: the ellipsis is dropped and
 * // as much of the prefix as possible is kept. Avoids results like '...e.pdf'.
 * truncateFileName('very-long-document-name.pdf', {
 *   maxLength: 10,
 *   minPrefixLength: 3,
 * });
 * // => 'very-l.pdf'
 *
 * @example
 * // File names without an extension.
 * truncateFileName('very-long-document-name', { maxLength: 15 });
 * // => 'very-long...ame'
 *
 * @example
 * // Not even room for the extension: its tail is kept, nothing is duplicated.
 * truncateFileName('a.pdf', { maxLength: 3 });
 * // => 'pdf'
 *
 * @example
 * // Dotfiles are names, not extensions.
 * truncateFileName('.gitignore', { maxLength: 8 });
 * // => '.g...ore'
 */
export function truncateFileName(
  fileName: string,
  config: TruncateFileNameConfig = {}
): string {
  const { prefix, ellipsis, suffix, extensionWithDot } = truncateFileNameParts(
    fileName,
    config
  );
  return `${prefix}${ellipsis}${suffix}${extensionWithDot}`;
}
