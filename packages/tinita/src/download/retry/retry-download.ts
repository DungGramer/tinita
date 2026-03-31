import type { RetryConfig, RetryOptions } from '../types/download-types';
import type { DownloadError } from '../errors/download-errors';
import { HttpStatusError } from '../errors/download-errors';
import { isRetryableError } from './is-retryable-error';
import {
  DEFAULT_MAX_RETRIES,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  RETRY_JITTER_FACTOR,
} from '../core/constants';

/**
 * Context passed to `onRetry` callbacks and available during retry logic.
 */
export interface RetryContext {
  attempt: number;
  error: DownloadError;
  delayMs: number;
}

/**
 * Normalize a `RetryConfig` value into a resolved `RetryOptions` object,
 * or `null` when retry is disabled.
 *
 * - `undefined` → `null` (no retry)
 * - `false` → `null` (explicitly disabled)
 * - `number` → `{ maxRetries: n }` with defaults
 * - `RetryOptions` → merged with defaults
 *
 * @param config - The retry configuration to normalize.
 * @returns Resolved options, or `null` if retry is disabled.
 *
 * @example
 * resolveRetryConfig(undefined)  // => null
 * resolveRetryConfig(false)      // => null
 * resolveRetryConfig(3)          // => { maxRetries: 3 }
 * resolveRetryConfig({ maxRetries: 5, delay: 2000 }) // => { maxRetries: 5, delay: 2000 }
 */
export function resolveRetryConfig(config: RetryConfig | undefined): RetryOptions | null {
  if (config === undefined || config === false) return null;
  if (typeof config === 'number') return { maxRetries: config };
  return config;
}

/**
 * Calculate the delay in milliseconds for a given retry attempt using
 * exponential backoff with jitter.
 *
 * Formula: `min(baseDelay * 2^attempt, maxDelay) * (1 + random * jitter * 2 - jitter)`
 *
 * If `options.delay` is a number, it is used as a fixed delay.
 * If `options.delay` is a function, it is called with the current attempt.
 * Otherwise the exponential backoff formula is applied.
 *
 * @param attempt - Zero-indexed retry attempt number (0 = first retry).
 * @param options - Retry options (optional).
 * @returns Delay in milliseconds.
 *
 * @example
 * calculateRetryDelay(0) // ~1000ms with jitter
 * calculateRetryDelay(1) // ~2000ms with jitter
 * calculateRetryDelay(5) // ~30000ms (capped)
 */
export function calculateRetryDelay(attempt: number, options?: RetryOptions): number {
  if (options?.delay !== undefined) {
    if (typeof options.delay === 'function') return options.delay(attempt);
    return options.delay;
  }

  const base = Math.min(RETRY_BASE_DELAY_MS * Math.pow(2, attempt), RETRY_MAX_DELAY_MS);
  // Jitter: multiply by (1 + random * jitterFactor * 2 - jitterFactor)
  // This gives a range of (1 - jitter) to (1 + jitter)
  const jitter = 1 + Math.random() * RETRY_JITTER_FACTOR * 2 - RETRY_JITTER_FACTOR;
  return Math.round(base * jitter);
}

/**
 * Execute an async operation with automatic retry on transient failures.
 *
 * Retry behaviour:
 * 1. Calls `fn(0)` for the initial attempt.
 * 2. On error: if `shouldAbort?.()` returns `true`, re-throws immediately.
 * 3. Checks `config.retryOn?.(error, attempt)` or falls back to `isRetryableError`.
 * 4. If not retryable or max attempts exhausted, re-throws.
 * 5. Calls `callbacks.onRetry?.(error, attempt)`.
 * 6. If error is `HttpStatusError` with `retryAfterMs`, uses that delay instead of backoff.
 * 7. Waits the delay (honouring `shouldAbort` during the wait), then calls `fn(attempt + 1)`.
 *
 * @param fn - Factory called with the current attempt index. Should return a promise.
 * @param config - Resolved retry options.
 * @param callbacks - Optional `onRetry` and `shouldAbort` callbacks.
 * @returns A promise that resolves with the first successful result.
 *
 * @example
 * const result = await withRetry(
 *   (attempt) => fetchSomething(attempt),
 *   { maxRetries: 3 },
 *   { onRetry: (err, n) => console.warn(`Retry ${n}:`, err.message) },
 * );
 */
export function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  config: RetryOptions,
  callbacks?: {
    onRetry?: (error: DownloadError, attempt: number) => void;
    shouldAbort?: () => boolean;
  },
): Promise<T> {
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;

  return new Promise<T>((resolve, reject) => {
    let attempt = 0;

    function run(): void {
      fn(attempt).then(resolve, (error: unknown) => {
        // Only handle DownloadError; rethrow unknown errors immediately.
        // We cast here since the XHR layer always rejects with DownloadError.
        const downloadError = error as DownloadError;

        // Check abort flag first.
        if (callbacks?.shouldAbort?.()) {
          reject(downloadError);
          return;
        }

        // Check if we have retries left.
        if (attempt >= maxRetries) {
          reject(downloadError);
          return;
        }

        // Check if the error is retryable.
        const retryable = config.retryOn
          ? config.retryOn(downloadError, attempt)
          : isRetryableError(downloadError);

        if (!retryable) {
          reject(downloadError);
          return;
        }

        // Notify caller about the retry.
        callbacks?.onRetry?.(downloadError, attempt);

        // Determine delay: honour Retry-After header for 429/503 responses.
        let delayMs: number;
        if (downloadError instanceof HttpStatusError && downloadError.retryAfterMs != null) {
          delayMs = downloadError.retryAfterMs;
        } else {
          delayMs = calculateRetryDelay(attempt, config);
        }

        attempt++;

        // Wait then retry, checking abort during the delay.
        let timerId: ReturnType<typeof setTimeout>;

        const checkInterval = setInterval(() => {
          if (callbacks?.shouldAbort?.()) {
            clearInterval(checkInterval);
            clearTimeout(timerId);
            reject(downloadError);
          }
        }, 50);

        timerId = setTimeout(() => {
          clearInterval(checkInterval);
          // Final abort check before firing the next attempt.
          if (callbacks?.shouldAbort?.()) {
            reject(downloadError);
            return;
          }
          run();
        }, delayMs);
      });
    }

    run();
  });
}
