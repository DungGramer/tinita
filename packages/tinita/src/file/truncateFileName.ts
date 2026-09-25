import { getFileNameParts } from './getFileNameParts';

export type TruncateFileNameConfig = {
  /** Maximum length of the result, in UTF-16 code units. Negative or NaN is clamped to 0. Default: 30 */
  maxLength?: number;
  /** String inserted between prefix and preserved suffix. Default: '...' */
  ellipsis?: string;
  /** Maximum characters kept from the end of the name, before the extension. Default: 3 */
  preservedSuffixLength?: number;
  /** Minimum characters kept from the start of the name when an ellipsis fits. Default: 1 */
  minPrefixLength?: number;
};

export type TruncatedFileNameParts = {
  /** Kept head of the name. */
  prefix: string;
  /** Ellipsis actually used - empty string when none was inserted. */
  ellipsis: string;
  /** Kept tail of the name, before the extension. */
  suffix: string;
  /** Extension including the leading dot, empty when there is none. */
  extensionWithDot: string;
  /** Full original name without the extension. */
  name: string;
  /** Original extension without the leading dot. */
  extension: string;
  /** Whether anything was dropped. `false` means the parts rebuild the input exactly. */
  truncated: boolean;
};

type TruncateFileNameStringConfig = TruncateFileNameConfig & {
  output?: 'string';
};
type TruncateFileNamePartsConfig = TruncateFileNameConfig & { output: 'parts' };

const isHighSurrogate = (code: number) => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff;

/**
 * Take at most `count` code units from the start without splitting a surrogate
 * pair. Splitting one yields a lone surrogate, which renders as a broken glyph.
 */
function takeStart(value: string, count: number): string {
  if (count <= 0) return '';
  if (count >= value.length) return value;
  const splitsPair =
    isLowSurrogate(value.charCodeAt(count)) &&
    isHighSurrogate(value.charCodeAt(count - 1));
  return value.slice(0, splitsPair ? count - 1 : count);
}

/**
 * Take at most `count` code units from the end without splitting a surrogate pair.
 * Guards count <= 0 explicitly: `slice(-0)` is `slice(0)` and returns the whole string.
 */
function takeEnd(value: string, count: number): string {
  if (count <= 0) return '';
  if (count >= value.length) return value;
  let start = value.length - count;
  if (
    isLowSurrogate(value.charCodeAt(start)) &&
    isHighSurrogate(value.charCodeAt(start - 1))
  ) {
    start += 1;
  }
  return value.slice(start);
}

/** Clamp a length option to a non-negative integer. NaN falls back to 0; Infinity passes through. */
const toLength = (value: number): number =>
  Number.isNaN(value) ? 0 : Math.max(0, Math.floor(value));

/**
 * Truncate a file name while preserving its extension and, when there is room,
 * a minimum prefix and a suffix of the original name.
 *
 * Available length is allocated in this order: extension, minimum prefix,
 * ellipsis, preserved suffix.
 *
 * The result never exceeds `maxLength`. It may come out one code unit shorter
 * when the cut would otherwise split a surrogate pair.
 *
 * Set `output` to `'parts'` to receive the pieces instead of a joined string;
 * `prefix + ellipsis + suffix + extensionWithDot` always equals the string form.
 *
 * @param fileName - Full file name, optionally including an extension
 * @param config - Truncation configuration
 * @returns The truncated file name, or its parts when `output` is `'parts'`
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
 *
 * @example
 * // Returns the pieces instead of a string.
 * truncateFileName('very-long-document-name.pdf', {
 *   maxLength: 20,
 *   output: 'parts',
 * });
 * // => {
 * //   prefix: 'very-long-',
 * //   ellipsis: '...',
 * //   suffix: 'ame',
 * //   extensionWithDot: '.pdf',
 * //   name: 'very-long-document-name',
 * //   extension: 'pdf',
 * //   truncated: true,
 * // }
 *
 * @example
 * // `truncated` tells a UI whether a tooltip with the full name is needed.
 * const { prefix, ellipsis, suffix, extensionWithDot, truncated } =
 *   truncateFileName(name, { maxLength: 20, output: 'parts' });
 *
 * // <span title={truncated ? name : undefined}>
 * //   <span>{prefix}</span>
 * //   <span>{ellipsis}</span>
 * //   <span>{suffix}</span>
 * //   <span>{extensionWithDot}</span>
 * // </span>
 */
export function truncateFileName(
  fileName: string,
  config?: TruncateFileNameStringConfig
): string;
export function truncateFileName(
  fileName: string,
  config: TruncateFileNamePartsConfig
): TruncatedFileNameParts;

export function truncateFileName(
  fileName: string,
  config: TruncateFileNameConfig & { output?: 'string' | 'parts' } = {}
): string | TruncatedFileNameParts {
  const { ellipsis = '...', output = 'string' } = config;

  const maxLength = toLength(config.maxLength ?? 30);
  const preservedSuffixLength = toLength(config.preservedSuffixLength ?? 3);
  const minPrefixLength = toLength(config.minPrefixLength ?? 1);

  const [name, extension] = getFileNameParts(fileName);
  const extensionWithDot = extension ? `.${extension}` : '';

  // Takes the extension explicitly so no branch can append it twice.
  const build = (
    prefix: string,
    usedEllipsis: string,
    suffix: string,
    ext: string
  ): string | TruncatedFileNameParts => {
    const text = `${prefix}${usedEllipsis}${suffix}${ext}`;
    if (output !== 'parts') return text;
    return {
      prefix,
      ellipsis: usedEllipsis,
      suffix,
      extensionWithDot: ext,
      name,
      extension,
      truncated: text !== fileName,
    };
  };

  // Fits already. Goes through build() so 'parts' is honoured here too.
  if (fileName.length <= maxLength)
    return build(name, '', '', extensionWithDot);

  // No room for the whole extension: keep its tail, and nothing else.
  if (maxLength <= extensionWithDot.length) {
    return build('', '', '', takeEnd(extensionWithDot, maxLength));
  }

  const availableNameLength = maxLength - extensionWithDot.length;

  // No room for minimum prefix plus ellipsis: drop the ellipsis, keep the prefix.
  if (availableNameLength <= minPrefixLength + ellipsis.length) {
    return build(
      takeStart(name, availableNameLength),
      '',
      '',
      extensionWithDot
    );
  }

  const maxSuffixLength =
    availableNameLength - ellipsis.length - minPrefixLength;
  const suffixLength = Math.min(
    preservedSuffixLength,
    Math.max(0, maxSuffixLength)
  );
  const prefixLength = availableNameLength - ellipsis.length - suffixLength;

  return build(
    takeStart(name, prefixLength),
    ellipsis,
    takeEnd(name, suffixLength),
    extensionWithDot
  );
}
