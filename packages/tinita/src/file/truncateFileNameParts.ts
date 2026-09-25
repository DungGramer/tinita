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
 * Truncate a file name and return its individual parts, for rendering each piece
 * separately in a UI.
 *
 * This is the primitive that computes the layout. Use {@link truncateFileName}
 * from `tinita/file/truncateFileName` when a single joined string is enough.
 *
 * Available length is allocated in this order: extension, minimum prefix,
 * ellipsis, preserved suffix.
 *
 * `prefix + ellipsis + suffix + extensionWithDot` never exceeds `maxLength`. It
 * may come out one code unit shorter when the cut would otherwise split a
 * surrogate pair.
 *
 * @param fileName - Full file name, optionally including an extension
 * @param config - Truncation configuration
 * @returns The parts of the truncated file name
 *
 * @example
 * truncateFileNameParts('very-long-document-name.pdf', { maxLength: 20 });
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
 * // Nothing to cut: the parts rebuild the input and `truncated` is false.
 * truncateFileNameParts('a.pdf');
 * // => {
 * //   prefix: 'a',
 * //   ellipsis: '',
 * //   suffix: '',
 * //   extensionWithDot: '.pdf',
 * //   name: 'a',
 * //   extension: 'pdf',
 * //   truncated: false,
 * // }
 *
 * @example
 * // `truncated` tells a UI whether a tooltip with the full name is needed.
 * const { prefix, ellipsis, suffix, extensionWithDot, truncated } =
 *   truncateFileNameParts(fileName, { maxLength: 20 });
 *
 * // <span title={truncated ? fileName : undefined}>
 * //   <span>{prefix}</span>
 * //   <span className="muted">{ellipsis}</span>
 * //   <span>{suffix}</span>
 * //   <span className="muted">{extensionWithDot}</span>
 * // </span>
 */
export function truncateFileNameParts(
  fileName: string,
  config: TruncateFileNameConfig = {}
): TruncatedFileNameParts {
  const { ellipsis = '...' } = config;

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
  ): TruncatedFileNameParts => ({
    prefix,
    ellipsis: usedEllipsis,
    suffix,
    extensionWithDot: ext,
    name,
    extension,
    truncated: `${prefix}${usedEllipsis}${suffix}${ext}` !== fileName,
  });

  // Fits already.
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
