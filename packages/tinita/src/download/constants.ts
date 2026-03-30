/**
 * Default filename used when none is provided and one cannot be inferred.
 *
 * @example
 * const filename = options.filename ?? DEFAULT_FILENAME; // 'download'
 */
export const DEFAULT_FILENAME = 'download';

/**
 * Default MIME type applied when none is specified.
 * Signals an arbitrary binary stream to the browser.
 *
 * @example
 * const mime = options.mimeType ?? DEFAULT_MIME_TYPE; // 'application/octet-stream'
 */
export const DEFAULT_MIME_TYPE = 'application/octet-stream';

/**
 * Default delay in milliseconds before revoking the object URL.
 * 40 seconds gives the browser ample time to start the download.
 *
 * @example
 * setTimeout(cleanup, options.revokeDelay ?? DEFAULT_REVOKE_DELAY);
 */
export const DEFAULT_REVOKE_DELAY = 40_000; // 40 s

/**
 * Default timeout in milliseconds for remote fetch requests.
 *
 * @example
 * const timeout = options.timeout ?? DEFAULT_FETCH_TIMEOUT; // 30_000
 */
export const DEFAULT_FETCH_TIMEOUT = 30_000; // 30 s

/**
 * UTF-8 Byte Order Mark character.
 * Prepend to text content (e.g. CSV) so Excel opens it with correct encoding.
 *
 * @example
 * const content = options.addBom ? UTF8_BOM + text : text;
 */
export const UTF8_BOM = '\uFEFF';

/**
 * Default throttle interval for progress events in milliseconds.
 * Progress callbacks will fire at most once per this interval.
 *
 * @example
 * const throttle = options.throttleProgressMs ?? DEFAULT_THROTTLE_PROGRESS_MS;
 */
export const DEFAULT_THROTTLE_PROGRESS_MS = 50;

/** Default maximum retry attempts. */
export const DEFAULT_MAX_RETRIES = 3;

/** Base delay for exponential backoff in ms. */
export const RETRY_BASE_DELAY_MS = 1_000;

/** Maximum delay cap for exponential backoff in ms. */
export const RETRY_MAX_DELAY_MS = 30_000;

/** Jitter factor for retry delay (0.2 = +/-20%). */
export const RETRY_JITTER_FACTOR = 0.2;

/** Maximum Retry-After header value in ms (5 minutes). */
export const MAX_RETRY_AFTER_MS = 300_000;

/** Maximum filename length in characters. */
export const MAX_FILENAME_LENGTH = 255;
