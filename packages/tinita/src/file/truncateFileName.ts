import { getFileNameParts } from "./getFileNameParts";

/**
 * Truncates a file name while preserving its extension and, when possible,
 * a minimum prefix and a suffix of the original file name.
 *
 * By default, the function returns a truncated string. Set `output` to
 * `'parts'` to receive the individual file name parts instead.
 *
 * When truncation is required, the available length is allocated in this order:
 * extension, minimum prefix, ellipsis, and preserved suffix.
 *
 * If `maxLength` is too small to fit the minimum prefix and ellipsis,
 * the function falls back to preserving as much of the prefix as possible.
 * The result always respects `maxLength`.
 *
 * @param fileName - Full file name, optionally including an extension
 * @param config - Truncation configuration
 * @param config.maxLength - Maximum length of the returned file name (default: 30)
 * @param config.ellipsis - String inserted between the prefix and preserved suffix (default: '...')
 * @param config.preservedSuffixLength - Maximum number of characters preserved from the end of the file name before the extension (default: 3)
 * @param config.minPrefixLength - Minimum number of characters preserved from the beginning of the file name when truncation is possible (default: 1)
 * @param config.output - Output format: `'string'` returns the truncated file name, while `'parts'` returns its individual parts (default: `'string'`)
 * @returns The truncated file name as a string, or its individual parts when `output` is `'parts'`
 *
 * @example
 * // Returns the original file name when it already fits within maxLength.
 * truncateFileName('document.pdf');
 * // => 'document.pdf'
 *
 * @example
 * // Truncates the file name while preserving the extension
 * // and the last 3 characters of the original name.
 * truncateFileName('very-long-document-name.pdf');
 * // => 'very-long-document...ame.pdf'
 *
 * @example
 * // Limits the result to exactly 20 characters.
 * truncateFileName('very-long-document-name.pdf', {
 *   maxLength: 20,
 * });
 * // => 'very-long-do...ame.pdf'
 *
 * @example
 * // Preserves 5 characters from the end of the file name.
 * truncateFileName('very-long-document-name.pdf', {
 *   maxLength: 24,
 *   preservedSuffixLength: 5,
 * });
 * // => 'very-long...-name.pdf'
 *
 * @example
 * // Requires at least 5 characters at the beginning of the file name.
 * truncateFileName('very-long-document-name.pdf', {
 *   maxLength: 20,
 *   minPrefixLength: 5,
 * });
 * // => 'very-long...me.pdf'
 *
 * @example
 * // Uses a single-character ellipsis.
 * truncateFileName('very-long-document-name.pdf', {
 *   maxLength: 20,
 *   ellipsis: '…',
 * });
 * // => 'very-long-doc…ame.pdf'
 *
 * @example
 * // A suffix longer than the available space is automatically reduced.
 * truncateFileName('very-long-document-name.pdf', {
 *   maxLength: 20,
 *   preservedSuffixLength: 20,
 * });
 * // => 'very-long-do...ame.pdf'
 *
 * @example
 * // When maxLength is too small to fit the minimum prefix and ellipsis,
 * // the function falls back to preserving as much of the prefix as possible.
 * // This avoids results such as "...e.pdf" with no meaningful prefix.
 * truncateFileName('very-long-document-name.pdf', {
 *   maxLength: 10,
 *   minPrefixLength: 3,
 * });
 * // => 'very-lo.pdf'
 *
 * @example
 * // Supports file names without an extension.
 * truncateFileName('very-long-document-name', {
 *   maxLength: 15,
 * });
 * // => 'very-long...ame'
 *
 * @example
 * // Returns the individual file name parts instead of a string.
 * truncateFileName('very-long-document-name.pdf', {
 *   maxLength: 20,
 *   output: 'parts',
 * });
 * // => {
 * //   prefix: 'very-long-do',
 * //   ellipsis: '...',
 * //   suffix: 'ame',
 * //   extensionWithDot: '.pdf',
 * //   name: 'very-long-document-name',
 * //   extension: 'pdf',
 * // }
 *
 * @example
 * // The 'parts' output is useful when different sections need
 * // to be rendered separately in a UI.
 * const { prefix, ellipsis, suffix, extensionWithDot } =
 *   truncateFileName('very-long-document-name.pdf', {
 *     maxLength: 20,
 *     output: 'parts',
 *   });
 *
 * // Render separately:
 * // <span>{prefix}</span>
 * // <span>{ellipsis}</span>
 * // <span>{suffix}</span>
 * // <span>{extensionWithDot}</span>
 */


type TruncateFileNameConfig = {
  maxLength?: number;
  ellipsis?: string;
  preservedSuffixLength?: number;
  minPrefixLength?: number;
};

type TruncatedFileNameParts = {
  prefix: string;
  ellipsis: string;
  suffix: string;
  extensionWithDot: string;
  name: string;
  extension: string;
};

type TruncateFileNameStringConfig = TruncateFileNameConfig & { output?: 'string'};
type TruncateFileNamePartsConfig = TruncateFileNameConfig & { output: 'parts' };

// Overloads
export function truncateFileName( fileName: string, config?: TruncateFileNameStringConfig): string;
export function truncateFileName(fileName: string, config: TruncateFileNamePartsConfig): TruncatedFileNameParts;

export function truncateFileName(
  fileName: string,
  {
    maxLength = 30,
    ellipsis = '...',
    preservedSuffixLength = 3,
    minPrefixLength = 1,
    output = 'string',
  }: TruncateFileNameConfig & {
    output?: 'string' | 'parts';
  } = {},
): string | TruncatedFileNameParts {
  if (fileName.length <= maxLength) return fileName;

  const [nameWithoutExt, extension] = getFileNameParts(fileName);
  const extensionWithDot = extension ? `.${extension}` : '';

    const createOutput = (
    prefix: string,
    suffix: string,
    outputEllipsis = ellipsis,
  ): string | TruncatedFileNameParts => {
    if (output === 'parts') return { prefix, ellipsis: outputEllipsis, suffix, extensionWithDot, name: nameWithoutExt, extension };
    return `${prefix}${outputEllipsis}${suffix}${extensionWithDot}`;
  };

  if (fileName.length <= maxLength) return createOutput(nameWithoutExt, '', '');

  if (maxLength <= extensionWithDot.length) return createOutput('', extensionWithDot.slice(-maxLength), '');

  const availableNameLength = maxLength - extensionWithDot.length;

  if (availableNameLength <= minPrefixLength + ellipsis.length) return createOutput(nameWithoutExt.slice(0, availableNameLength), '', '');

  const maxSuffixLength = availableNameLength - ellipsis.length - minPrefixLength;
  const suffixLength = Math.min(preservedSuffixLength, Math.max(0, maxSuffixLength));
  const prefixLength = availableNameLength - ellipsis.length - suffixLength;

  const prefix = nameWithoutExt.slice(0, prefixLength);
  const suffix = nameWithoutExt.slice(-suffixLength);

  return createOutput(prefix, suffix);
}
