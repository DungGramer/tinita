import type { DownloadError } from '../errors/download-errors';

/**
 * All supported input types for a download operation.
 *
 * - `Blob` / `File` — used directly
 * - `ArrayBuffer` / `Uint8Array` — wrapped in a Blob
 * - `string` — interpreted according to `DownloadOptions.inputType`
 * - `URL` — treated as a remote URL to fetch
 * - `Response` — body extracted from a Fetch API response
 */
export type DownloadInput =
  | Blob
  | File
  | ArrayBuffer
  | Uint8Array
  | string
  | URL
  | Response;

/**
 * Disambiguates how a plain `string` input should be interpreted.
 *
 * - `'text'`      — raw text content (e.g. CSV, plain-text file)
 * - `'url'`       — a remote URL to fetch before downloading
 * - `'data-url'`  — a `data:` URI (e.g. `data:image/png;base64,...`)
 *
 * @default `'text'` when `inputType` is omitted
 */
export type StringInputType = 'text' | 'url' | 'data-url';

/**
 * Options that apply to every download operation.
 *
 * @example
 * const opts: DownloadOptions = {
 *   filename: 'report.csv',
 *   mimeType: 'text/csv',
 *   addBom: true,
 *   revokeDelay: 60_000,
 * };
 */
export interface DownloadOptions {
  /** Suggested filename for the downloaded file. */
  filename?: string;

  /** MIME type of the file content. */
  mimeType?: string;

  /**
   * How to interpret a plain `string` input.
   * Ignored for non-string inputs.
   * @default 'text'
   */
  inputType?: StringInputType;

  /**
   * Prepend a UTF-8 BOM (`\uFEFF`) to text content.
   * Useful for CSV files opened in Excel.
   * @default false
   */
  addBom?: boolean;

  /**
   * Milliseconds to wait before revoking the object URL.
   * @default 40_000
   */
  revokeDelay?: number;

  /**
   * Automatically revoke the object URL after `revokeDelay` ms.
   * Set to `false` to manage cleanup manually via `DownloadResult.cleanup`.
   * @default true
   */
  autoRevoke?: boolean;

  /**
   * Called immediately before the browser download is triggered.
   * Return `false` to cancel the download.
   *
   * @param result - The prepared download, ready to trigger.
   */
  onBeforeDownload?: (result: PreparedDownload) => void | boolean;

  /**
   * Called after the download has been triggered successfully.
   *
   * @param result - The final download result.
   */
  onAfterDownload?: (result: DownloadResult) => void;

  /**
   * Called when the download fails.
   * If provided, errors will NOT be re-thrown.
   *
   * @param error - The download error.
   */
  onError?: (error: DownloadError) => void;
}

/**
 * Configuration for automatic retry on retryable errors.
 * Pass a number for simple maxRetries with default backoff.
 * Pass false to disable retry entirely.
 */
export type RetryConfig = RetryOptions | number | false;

/** Full retry configuration object. */
export interface RetryOptions {
  /** Maximum number of retry attempts. @default 3 */
  maxRetries?: number;
  /**
   * Delay between retries in ms.
   * - number: fixed delay
   * - function: dynamic delay per attempt (0-indexed)
   * @default exponentialBackoff (1000ms base, 2x, 30s cap, 20% jitter)
   */
  delay?: number | ((attempt: number) => number);
  /**
   * Custom predicate to decide if an error should be retried.
   * When provided, overrides the default retryable error classification.
   */
  retryOn?: (error: DownloadError, attempt: number) => boolean;
}

/**
 * Options specific to URL-based downloads (XHR-based).
 * Extends `DownloadOptions` with XHR configuration and lifecycle callbacks.
 *
 * @example
 * const opts: DownloadFromUrlOptions = {
 *   filename: 'data.json',
 *   timeout: 10_000,
 *   headers: { Authorization: 'Bearer token' },
 *   onProgress: (p) => console.log(p.percent),
 * };
 */
export interface DownloadFromUrlOptions extends DownloadOptions {
  /** Custom request headers. */
  headers?: Record<string, string>;

  /**
   * Send cookies cross-origin.
   * @default false
   */
  withCredentials?: boolean;

  /**
   * Request timeout in milliseconds.
   * @default 30_000
   */
  timeout?: number;

  /**
   * Throttle `onProgress` calls to at most once per N ms.
   * @default 50
   */
  throttleProgressMs?: number;

  /** Called when the XHR request starts. */
  onStart?: () => void;

  /** Called on each progress event (throttled by `throttleProgressMs`). */
  onProgress?: (progress: DownloadProgress) => void;

  /** Called when the download completes successfully. */
  onSuccess?: (result: DownloadResult) => void;

  /** Called when the download fails. */
  onError?: (error: DownloadError) => void;

  /** Called when the download is aborted. */
  onAbort?: () => void;

  /** Called whenever the download status changes. */
  onStateChange?: (status: DownloadStatus) => void;

  /**
   * Retry configuration for transient failures.
   * - number: maxRetries with default backoff
   * - RetryOptions: full configuration
   * - false: disable retry
   * @default false (no retry -- opt-in)
   */
  retry?: RetryConfig;

  /**
   * Minimum duration in ms before resolving the download.
   * Prevents progress bar flash for fast downloads.
   * 0 = disabled.
   * @default 0
   */
  minDuration?: number;

  /** Called before each retry attempt. */
  onRetry?: (error: DownloadError, attempt: number) => void;
}

/**
 * The result returned after a download has been triggered.
 *
 * @example
 * const result = await download(blob, { filename: 'file.bin' });
 * if (result.success) {
 *   console.log(`Downloaded ${result.size} bytes as "${result.filename}"`);
 * }
 */
export interface DownloadResult {
  /** Whether the download was triggered without error. */
  success: boolean;

  /** Resolved filename used for the download. */
  filename: string;

  /** The Blob that was downloaded. */
  blob: Blob;

  /** Size of the Blob in bytes. */
  size: number;

  /** MIME type of the Blob. */
  mimeType: string;

  /** Whether the anchor click was triggered. */
  clicked: boolean;

  /** Whether the object URL has been revoked. */
  revoked: boolean;

  /**
   * Revoke the object URL immediately and release memory.
   * No-op if already revoked.
   */
  cleanup: () => void;
}

/**
 * An intermediate representation of a download that is ready to trigger.
 * Returned by prepare functions; allows inspection before triggering.
 *
 * @example
 * const prepared = await prepareDownload(blob, { filename: 'file.bin' });
 * console.log(`About to download ${prepared.size} bytes`);
 * const result = prepared.trigger();
 */
export interface PreparedDownload {
  /** The Blob to be downloaded. */
  blob: Blob;

  /** Resolved filename that will be suggested to the browser. */
  filename: string;

  /** Temporary object URL (`blob:...`) for the Blob. */
  objectUrl: string;

  /** MIME type of the Blob. */
  mimeType: string;

  /** Size of the Blob in bytes. */
  size: number;

  /**
   * Trigger the browser download immediately.
   * Returns the final `DownloadResult`.
   */
  trigger: () => DownloadResult;

  /**
   * Revoke the object URL and release memory without triggering a download.
   */
  cleanup: () => void;
}

/**
 * Lifecycle state of an XHR-based download operation.
 *
 * - `'idle'`        — not started
 * - `'starting'`    — request initialised, not yet receiving data
 * - `'downloading'` — bytes are being received
 * - `'completed'`   — finished successfully
 * - `'failed'`      — finished with an error
 * - `'aborted'`     — cancelled by the caller
 */
export type DownloadStatus = 'idle' | 'starting' | 'downloading' | 'completed' | 'failed' | 'aborted';

/**
 * Snapshot of download progress reported on each XHR progress event.
 */
export type DownloadProgress = {
  /** Bytes received so far. */
  loaded: number;
  /** Total bytes, or `null` if the server did not send `Content-Length`. */
  total: number | null;
  /** Download percentage 0-100, or `null` when total is unknown. */
  percent: number | null;
  /** Whether the browser knows the total size. */
  lengthComputable: boolean;
  /** Current transfer speed in bytes per second, or `null` until 2+ progress events. */
  speedBps: number | null;
  /** Estimated time remaining in milliseconds, or `null` when speed is unknown. */
  etaMs: number | null;
};

/**
 * Handle returned by `downloadFromUrl` for advanced control over the XHR request.
 *
 * @example
 * const task = downloadFromUrl('https://example.com/file.zip');
 * task.promise.then((result) => console.log('done', result.size));
 * // Cancel midway:
 * task.abort();
 */
export type DownloadTask = {
  /** Resolves with `DownloadResult` on successful completion. */
  promise: Promise<DownloadResult>;
  /** Abort the in-flight XHR request. */
  abort: () => void;
  /** The underlying `XMLHttpRequest` instance (for advanced use). */
  xhr: XMLHttpRequest;
};

/** Status of an individual item in the download queue. */
export type QueueItemStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'aborted';

/** Represents a single item in the download queue. */
export interface QueueItem {
  /** Unique identifier for this queue entry. */
  id: string;
  /** The URL to download. */
  url: string | URL;
  /** Current status. */
  status: QueueItemStatus;
  /** Progress snapshot, null until downloading. */
  progress: DownloadProgress | null;
  /** Result on success, null otherwise. */
  result: DownloadResult | null;
  /** Error on failure, null otherwise. */
  error: DownloadError | null;
  /** Per-item download options. */
  options?: DownloadFromUrlOptions;
}

/**
 * Options for blob URL management when triggering a browser download.
 */
export interface DownloadBlobOptions {
  /**
   * Milliseconds before revoking the object URL.
   * @default 40_000
   */
  revokeDelay?: number;
  /**
   * Automatically revoke the object URL after `revokeDelay` ms.
   * @default true
   */
  autoRevoke?: boolean;
}
