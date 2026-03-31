/**
 * Error codes for all download-related failures.
 * Use these for programmatic error handling.
 *
 * @example
 * if (err instanceof DownloadError && err.code === DownloadErrorCode.FETCH_TIMEOUT) {
 *   console.warn('Download timed out, retrying...');
 * }
 */
export enum DownloadErrorCode {
  /** The input value is null, undefined, or an unsupported type. */
  INVALID_INPUT = 'DOWNLOAD_INVALID_INPUT',

  /** Failed to construct a Blob from the given input. */
  BLOB_CREATION_FAILED = 'DOWNLOAD_BLOB_CREATION_FAILED',

  /** The operation requires a browser environment (window + document). */
  BROWSER_ONLY = 'DOWNLOAD_BROWSER_ONLY',

  /** The fetch request returned a non-OK HTTP response. */
  FETCH_FAILED = 'DOWNLOAD_FETCH_FAILED',

  /** The fetch request exceeded the configured timeout. */
  FETCH_TIMEOUT = 'DOWNLOAD_FETCH_TIMEOUT',

  /** The fetch request was cancelled via an AbortSignal. */
  FETCH_ABORTED = 'DOWNLOAD_FETCH_ABORTED',

  /** The browser download trigger (anchor click / msSaveBlob) failed. */
  TRIGGER_FAILED = 'DOWNLOAD_TRIGGER_FAILED',

  /** The XHR request received a non-2xx HTTP status code. */
  HTTP_STATUS = 'DOWNLOAD_HTTP_STATUS',

  /** A network-level error occurred during the XHR request. */
  NETWORK = 'DOWNLOAD_NETWORK',

  /** The XHR request exceeded the configured timeout. */
  XHR_TIMEOUT = 'DOWNLOAD_XHR_TIMEOUT',

  /** The download was aborted by the caller. */
  ABORTED = 'DOWNLOAD_ABORTED',

  /** The XHR response could not be interpreted as a valid Blob. */
  INVALID_BLOB_RESPONSE = 'DOWNLOAD_INVALID_BLOB_RESPONSE',
}

/**
 * Error class for all download-related failures.
 * Always carries a `code` for programmatic handling and an optional `cause`
 * for the original thrown value.
 *
 * @example
 * throw new DownloadError(
 *   'Input is not a valid Blob',
 *   DownloadErrorCode.INVALID_INPUT,
 * );
 *
 * @example
 * try {
 *   await downloadFromUrl('https://example.com/file.zip');
 * } catch (err) {
 *   if (err instanceof DownloadError) {
 *     console.error(err.code, err.message);
 *   }
 * }
 */
export class DownloadError extends Error {
  /**
   * Machine-readable error code. Use `DownloadErrorCode` enum values.
   */
  public readonly code: DownloadErrorCode;

  /**
   * The original error or value that caused this error, if any.
   */
  public readonly cause: unknown;

  constructor(message: string, code: DownloadErrorCode, cause?: unknown) {
    super(message);
    this.name = 'DownloadError';
    this.code = code;
    this.cause = cause;

    // Restore prototype chain in environments that transpile classes to ES5.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the server responds with a non-2xx HTTP status code.
 *
 * @example
 * throw new HttpStatusError(404, 'Not Found');
 */
export class HttpStatusError extends DownloadError {
  /** The HTTP status code returned by the server. */
  public readonly status: number;
  /** The HTTP status text returned by the server. */
  public readonly statusText: string;
  /**
   * Parsed value of the `Retry-After` response header in milliseconds, if present.
   * Used by the retry logic to honour server-specified back-off.
   */
  public readonly retryAfterMs?: number;

  constructor(status: number, statusText: string, retryAfterMs?: number) {
    super(`HTTP ${status} ${statusText}`, DownloadErrorCode.HTTP_STATUS);
    this.name = 'HttpStatusError';
    this.status = status;
    this.statusText = statusText;
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a network-level error occurs (e.g. no connectivity, DNS failure).
 *
 * @example
 * throw new NetworkError(originalError);
 */
export class NetworkError extends DownloadError {
  constructor(cause?: unknown) {
    super('Network error during download', DownloadErrorCode.NETWORK, cause);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the XHR request exceeds the configured timeout.
 *
 * @example
 * throw new TimeoutError(30_000);
 */
export class TimeoutError extends DownloadError {
  /** The timeout threshold in milliseconds. */
  public readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Download timed out after ${timeoutMs}ms`, DownloadErrorCode.XHR_TIMEOUT);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the download is cancelled by the caller via `task.abort()`.
 *
 * @example
 * throw new AbortDownloadError();
 */
export class AbortDownloadError extends DownloadError {
  constructor() {
    super('Download was aborted', DownloadErrorCode.ABORTED);
    this.name = 'AbortDownloadError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the XHR response body cannot be interpreted as a valid Blob.
 *
 * @example
 * throw new InvalidBlobResponseError();
 */
export class InvalidBlobResponseError extends DownloadError {
  constructor() {
    super('XHR response is not a valid Blob', DownloadErrorCode.INVALID_BLOB_RESPONSE);
    this.name = 'InvalidBlobResponseError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
