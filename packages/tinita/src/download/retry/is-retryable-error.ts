import { HttpStatusError, NetworkError, TimeoutError } from '../errors/download-errors';
import type { DownloadError } from '../errors/download-errors';
import { MAX_RETRY_AFTER_MS } from '../core/constants';

/** HTTP status codes that are considered transient and worth retrying. */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Determine whether a {@link DownloadError} represents a transient failure
 * that should trigger an automatic retry.
 *
 * Retryable:
 * - `NetworkError` — connectivity loss, DNS failure, etc.
 * - `TimeoutError` — request exceeded the configured timeout.
 * - `HttpStatusError` with status 408, 429, 500, 502, 503, or 504.
 *
 * Non-retryable:
 * - `AbortDownloadError` — caller explicitly cancelled.
 * - `InvalidBlobResponseError` — malformed response body.
 * - `HttpStatusError` with any other 4xx status.
 * - All other error codes.
 *
 * @param error - A `DownloadError` instance to classify.
 * @returns `true` if the error is retryable, `false` otherwise.
 *
 * @example
 * try {
 *   await downloadFromUrl(url);
 * } catch (err) {
 *   if (err instanceof DownloadError && isRetryableError(err)) {
 *     scheduleRetry();
 *   }
 * }
 */
export function isRetryableError(error: DownloadError): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof TimeoutError) return true;
  if (error instanceof HttpStatusError) {
    return RETRYABLE_STATUSES.has(error.status);
  }
  return false;
}

/**
 * Parse an HTTP `Retry-After` header value into a millisecond delay.
 *
 * Supports two formats defined by RFC 7231:
 * - **Delta-seconds** — `"120"` → `120_000` ms
 * - **HTTP-date** — `"Wed, 21 Oct 2015 07:28:00 GMT"` → ms until that instant
 *
 * Returns `null` when:
 * - The value is `null`, `undefined`, or empty.
 * - The value cannot be parsed as either format.
 * - The computed delay is negative (date in the past).
 *
 * The result is capped at 300 000 ms (5 minutes) to prevent absurd waits.
 *
 * @param headerValue - Raw `Retry-After` header string, or `null`/`undefined`.
 * @returns Milliseconds to wait before retrying, or `null`.
 *
 * @example
 * parseRetryAfterMs('120')                             // => 120_000
 * parseRetryAfterMs('Wed, 21 Oct 2015 07:28:00 GMT')  // => ms until that date (or null if past)
 * parseRetryAfterMs(null)                              // => null
 * parseRetryAfterMs('banana')                          // => null
 */
export function parseRetryAfterMs(headerValue: string | null | undefined): number | null {
  if (headerValue == null || headerValue.trim() === '') return null;

  const trimmed = headerValue.trim();

  // Try delta-seconds (numeric string).
  if (/^\d+$/.test(trimmed)) {
    const seconds = parseInt(trimmed, 10);
    if (isNaN(seconds)) return null;
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }

  // Try HTTP-date string.
  const targetMs = Date.parse(trimmed);
  if (isNaN(targetMs)) return null;

  const delayMs = targetMs - Date.now();
  if (delayMs < 0) return null;

  return Math.min(delayMs, MAX_RETRY_AFTER_MS);
}
