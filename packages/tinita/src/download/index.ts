// Types
export type { DownloadInput, DownloadOptions, DownloadFromUrlOptions, DownloadResult, PreparedDownload, StringInputType } from './types';
export type { DownloadStatus, DownloadProgress, DownloadTask, DownloadBlobOptions } from './types';
export type { DetectedInputType } from './detect-input-type';
export type { ObjectUrlHandle } from './create-object-url';

// Errors
export { DownloadError, DownloadErrorCode } from './errors';
export { HttpStatusError, NetworkError, TimeoutError, AbortDownloadError, InvalidBlobResponseError } from './errors';

// High-level API (most users only need these)
export { download } from './download';
export { downloadFromUrl } from './download-from-url';
export { downloadBlob } from './download-blob';
export { prepareDownload } from './prepare-download';

// Core utilities (advanced users)
export { toBlob } from './to-blob';
export { resolveFilename } from './resolve-filename';
export { detectInputType } from './detect-input-type';
export { parseContentDisposition } from './parse-content-disposition';
export { fetchWithTimeout } from './fetch-with-timeout';
export { formatBytes } from './format-bytes';
export { formatDuration } from './format-duration';

// Browser primitives (advanced users)
export { createObjectUrl } from './create-object-url';
export { createAnchor } from './create-anchor';
export { triggerDownload } from './trigger-download';

// Environment
export { isBrowser, supportsDownloadAttribute, supportsMsSaveBlob } from './env';

// New types
export type { RetryConfig, RetryOptions, QueueItemStatus, QueueItem } from './types';

// New utilities
export { sanitizeFilename } from './sanitize-filename';
export type { SanitizeFilenameOptions } from './sanitize-filename';
export { isRetryableError, parseRetryAfterMs } from './is-retryable-error';
export { createSpeedSmoother } from './smooth-progress';
export type { SpeedSmoother } from './smooth-progress';
export { resolveRetryConfig, calculateRetryDelay, withRetry } from './retry-download';
export { waitMinDuration } from './min-duration-delay';

// New constants
export {
  DEFAULT_MAX_RETRIES,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  RETRY_JITTER_FACTOR,
  MAX_RETRY_AFTER_MS,
  MAX_FILENAME_LENGTH,
} from './constants';
