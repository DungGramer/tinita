// Types
export type {
  DownloadInput,
  StringInputType,
  DownloadOptions,
  RetryConfig,
  RetryOptions,
  DownloadFromUrlOptions,
  DownloadResult,
  PreparedDownload,
  DownloadStatus,
  DownloadProgress,
  DownloadTask,
  QueueItemStatus,
  QueueItem,
  DownloadBlobOptions,
} from './types';

// Errors
export {
  DownloadErrorCode,
  DownloadError,
  HttpStatusError,
  NetworkError,
  TimeoutError,
  AbortDownloadError,
  InvalidBlobResponseError,
} from './errors';

// High-level API (most users only need these)
export { download, downloadFromUrl, downloadBlob, prepareDownload } from './api';

// Core utilities (advanced users)
export type { DetectedInputType } from './core';
export {
  detectInputType,
  toBlob,
  resolveFilename,
  parseContentDisposition,
  sanitizeFilename,
  formatDuration,
  isBrowser,
  supportsDownloadAttribute,
  supportsMsSaveBlob,
} from './core';
export type { ToBlobOptions, SanitizeFilenameOptions, ResolveFilenameOptions } from './core';

// Browser primitives (advanced users)
export type { ObjectUrlHandle } from './browser';
export { createObjectUrl, createAnchor, triggerDownload, fetchWithTimeout } from './browser';

// Retry utilities
export { isRetryableError, parseRetryAfterMs, resolveRetryConfig, calculateRetryDelay, withRetry, waitMinDuration, createSpeedSmoother } from './retry';
export type { SpeedSmoother, RetryContext } from './retry';

// Constants
export {
  DEFAULT_MAX_RETRIES,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  RETRY_JITTER_FACTOR,
  MAX_RETRY_AFTER_MS,
  MAX_FILENAME_LENGTH,
} from './core';
