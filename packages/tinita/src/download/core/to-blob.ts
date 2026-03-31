import type { DownloadInput, StringInputType } from '../types/download-types';
import { DownloadError, DownloadErrorCode } from '../errors/download-errors';
import { DEFAULT_MIME_TYPE, UTF8_BOM } from './constants';
import { detectInputType } from './detect-input-type';

/**
 * Options for {@link toBlob}.
 */
export interface ToBlobOptions {
  /**
   * MIME type to assign to the resulting Blob.
   * When omitted the existing type is preserved where possible;
   * text content falls back to `'text/plain;charset=utf-8'`.
   */
  mimeType?: string;
  /**
   * Hint about the string variant when `input` is a string.
   * When omitted, {@link detectInputType} is used to auto-detect.
   */
  inputType?: StringInputType;
  /**
   * Prepend a UTF-8 BOM (`\uFEFF`) to plain-text string content.
   * Only applied when the resolved input type is `'text'`.
   * @default false
   */
  addBom?: boolean;
}

/**
 * Convert any supported download input into a `Blob`.
 *
 * Handles all `DownloadInput` variants:
 * - `Blob` / `File` — returned as-is, or re-wrapped with a new MIME type
 * - `ArrayBuffer` / `Uint8Array` — wrapped in `new Blob([input])`
 * - `Response` — body consumed via `response.blob()`
 * - string (`'text'`) — encoded as UTF-8 text, optionally with BOM
 * - string (`'data-url'`) — base64 payload decoded to binary Blob
 * - string (`'url-string'` / `'url-object'`) — **not supported**; callers
 *   must fetch the resource with {@link fetchWithTimeout} first
 *
 * @param input - The value to convert.
 * @param options - Conversion options.
 * @returns A `Promise` resolving to a `Blob`.
 *
 * @throws {DownloadError} `INVALID_INPUT` when a URL string or URL object is
 *   passed directly (callers must fetch these first).
 *
 * @example
 * // Plain text
 * const blob = await toBlob('Hello, world!');
 *
 * @example
 * // ArrayBuffer with explicit MIME type
 * const buf = new ArrayBuffer(4);
 * const blob = await toBlob(buf, { mimeType: 'application/octet-stream' });
 *
 * @example
 * // Data URL
 * const blob = await toBlob('data:image/png;base64,iVBORw0KGgo=');
 *
 * @example
 * // Fetch Response
 * const res = await fetch('https://example.com/file.pdf');
 * const blob = await toBlob(res);
 */
export async function toBlob(
  input: DownloadInput,
  options: ToBlobOptions = {},
): Promise<Blob> {
  const { mimeType, inputType, addBom = false } = options;

  // When caller provides an explicit inputType hint for a string, use it directly.
  // Otherwise auto-detect. Cast to a common string type to unify both vocabularies.
  const detected: string =
    typeof input === 'string' && inputType != null ? inputType : detectInputType(input);

  switch (detected) {
    case 'file':
    case 'blob': {
      const blob = input as Blob;
      if (mimeType && mimeType !== blob.type) {
        return new Blob([blob], { type: mimeType });
      }
      return blob;
    }

    case 'arraybuffer': {
      return new Blob([input as ArrayBuffer], { type: mimeType ?? DEFAULT_MIME_TYPE });
    }

    case 'uint8array': {
      // Cast to Uint8Array<ArrayBuffer> to satisfy strict BlobPart type constraints
      const u8 = input as Uint8Array<ArrayBuffer>;
      return new Blob([u8], { type: mimeType ?? DEFAULT_MIME_TYPE });
    }

    case 'response': {
      const response = input as Response;
      const blob = await response.blob();
      if (mimeType && mimeType !== blob.type) {
        return new Blob([blob], { type: mimeType });
      }
      return blob;
    }

    case 'text': {
      const str = input as string;
      const type = mimeType ?? 'text/plain;charset=utf-8';
      const content = addBom ? UTF8_BOM + str : str;
      return new Blob([content], { type });
    }

    case 'data-url': {
      return decodeDataUrl(input as string, mimeType);
    }

    // 'url-string' / 'url-object' come from detectInputType (DetectedInputType)
    // 'url' comes from StringInputType when caller passes inputType: 'url'
    case 'url':
    case 'url-string':
    case 'url-object': {
      throw new DownloadError(
        'URL inputs must be fetched first with fetchWithTimeout() before passing to toBlob().',
        DownloadErrorCode.INVALID_INPUT,
      );
    }

    default: {
      throw new DownloadError(
        `Unsupported input type: ${detected as string}`,
        DownloadErrorCode.INVALID_INPUT,
      );
    }
  }
}

/**
 * Decode a data URL string into a Blob.
 *
 * Supports both base64 (`data:<mime>;base64,<data>`) and plain text
 * (`data:<mime>,<data>`) data URLs.
 */
function decodeDataUrl(dataUrl: string, overrideMime?: string): Blob {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    throw new DownloadError('Malformed data URL: missing comma.', DownloadErrorCode.INVALID_INPUT);
  }

  const meta = dataUrl.slice(0, commaIndex); // e.g. "data:image/png;base64"
  const payload = dataUrl.slice(commaIndex + 1);

  // Extract MIME type from meta section: data:[<mime>][;base64]
  const mimeMatch = /^data:([^;,]+)/i.exec(meta);
  const detectedMime = mimeMatch?.[1] ?? 'application/octet-stream';
  const resolvedMime = overrideMime ?? detectedMime;

  const isBase64 = meta.endsWith(';base64');

  if (isBase64) {
    let binary: string;
    try {
      binary = atob(payload);
    } catch {
      throw new DownloadError(
        'Data URL contains invalid base64 payload.',
        DownloadErrorCode.INVALID_INPUT,
      );
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: resolvedMime });
  }

  // Plain-text data URL: percent-decoded content
  try {
    const decoded = decodeURIComponent(payload);
    return new Blob([decoded], { type: resolvedMime });
  } catch {
    return new Blob([payload], { type: resolvedMime });
  }
}
