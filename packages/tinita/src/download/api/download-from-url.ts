import type { DownloadFromUrlOptions, DownloadTask, DownloadResult, DownloadProgress } from '../types/download-types';
import { HttpStatusError, NetworkError, TimeoutError, AbortDownloadError, InvalidBlobResponseError, type DownloadError } from '../errors/download-errors';
import { assertBrowser } from '../core/env';
import { resolveFilename } from '../core/resolve-filename';
import { createObjectUrl } from '../browser/create-object-url';
import { triggerDownload } from '../browser/trigger-download';
import { DEFAULT_FETCH_TIMEOUT, DEFAULT_THROTTLE_PROGRESS_MS } from '../core/constants';
import { resolveRetryConfig, withRetry } from '../retry/retry-download';
import { waitMinDuration } from '../retry/min-duration-delay';
import { createSpeedSmoother } from '../retry/smooth-progress';
import { parseRetryAfterMs } from '../retry/is-retryable-error';

/**
 * Fetch a remote resource via XHR and immediately trigger a browser download,
 * with real-time progress tracking, cancellation support, automatic retry,
 * and minimum-duration enforcement.
 *
 * Unlike the previous fetch-based implementation, this function returns a
 * `DownloadTask` synchronously. The underlying `XMLHttpRequest` starts
 * immediately; await `task.promise` to get the final `DownloadResult`.
 *
 * @param url - The remote URL to fetch. Accepts a `string` or a `URL` object.
 * @param options - Headers, timeout, progress callbacks, filename override,
 *   MIME type, revoke settings, lifecycle hooks, retry config, and minDuration.
 * @returns A `DownloadTask` with `{ promise, abort, xhr }`.
 *
 * @throws {DownloadError} `BROWSER_ONLY`          — called outside a browser context.
 * @throws {HttpStatusError}                        — non-2xx HTTP response.
 * @throws {NetworkError}                           — network-level failure.
 * @throws {TimeoutError}                           — request exceeded `options.timeout` ms.
 * @throws {AbortDownloadError}                     — cancelled via `task.abort()`.
 * @throws {InvalidBlobResponseError}               — XHR response body is not a Blob.
 *
 * @example
 * // Basic usage — await the promise
 * const task = downloadFromUrl('https://example.com/report.pdf');
 * const result = await task.promise;
 * console.log(result.filename); // 'report.pdf'
 *
 * @example
 * // With progress tracking and custom headers
 * const task = downloadFromUrl('https://api.example.com/export', {
 *   filename: 'export.csv',
 *   timeout: 15_000,
 *   headers: { Authorization: 'Bearer token' },
 *   onProgress: (p) => {
 *     if (p.percent !== null) console.log(`${p.percent}%`);
 *   },
 * });
 * const result = await task.promise;
 *
 * @example
 * // With retry and minimum duration
 * const task = downloadFromUrl('https://example.com/data.csv', {
 *   retry: { maxRetries: 3 },
 *   minDuration: 500,
 *   onRetry: (err, n) => console.warn(`Retry ${n}:`, err.message),
 * });
 *
 * @example
 * // Cancel midway
 * const task = downloadFromUrl('https://example.com/large-file.zip');
 * setTimeout(() => task.abort(), 3_000);
 * try {
 *   await task.promise;
 * } catch (err) {
 *   if (err instanceof AbortDownloadError) console.log('Download cancelled');
 * }
 */
export function downloadFromUrl(
  url: string | URL,
  options: DownloadFromUrlOptions = {},
): DownloadTask {
  // Guard: must be in a browser environment before creating XHR
  assertBrowser('downloadFromUrl');

  const {
    headers,
    withCredentials = false,
    timeout = DEFAULT_FETCH_TIMEOUT,
    throttleProgressMs = DEFAULT_THROTTLE_PROGRESS_MS,
    filename: filenameOverride,
    mimeType,
    revokeDelay,
    autoRevoke,
    onStart,
    onProgress,
    onSuccess,
    onError,
    onAbort,
    onStateChange,
    retry: retryConfig,
    minDuration = 0,
    onRetry,
  } = options;

  // Mutable ref to the currently active XHR (changes between retries).
  let currentXhr: XMLHttpRequest = new XMLHttpRequest();
  // Abort flag shared across closure — survives between retry attempts.
  let aborted = false;
  // Speed smoother — created once, reset on each retry attempt.
  const smoother = createSpeedSmoother(0.3);
  // Track download start time for minDuration (persists across retries).
  const downloadStartTime = Date.now();

  /**
   * Creates a single XHR attempt. Called directly or by `withRetry`.
   * Each call creates a fresh XMLHttpRequest and updates `currentXhr`.
   */
  function createAttempt(attempt: number): Promise<DownloadResult> {
    // Reset speed smoother on every attempt (including first).
    smoother.reset();

    const xhr = new XMLHttpRequest();
    currentXhr = xhr;

    return new Promise<DownloadResult>((resolve, reject) => {
      // Progress tracking state — local to each attempt.
      let lastProgressTime = 0;
      const startTime = Date.now();

      // ── loadstart: request initialised ──────────────────────────────────────
      xhr.onloadstart = () => {
        // Only emit 'starting' on the first attempt to avoid spurious state changes during retry.
        if (attempt === 0) {
          onStateChange?.('starting');
          onStart?.();
        }
      };

      // ── progress: bytes arriving ─────────────────────────────────────────────
      xhr.onprogress = (event: ProgressEvent) => {
        onStateChange?.('downloading');

        const now = Date.now();

        // Throttle: skip if within throttle window (0 means no throttle)
        if (throttleProgressMs > 0 && (now - lastProgressTime) < throttleProgressMs) return;
        lastProgressTime = now;

        const elapsed = now - startTime;
        const rawSpeedBps: number | null = elapsed > 0 ? (event.loaded / elapsed) * 1000 : null;

        // Apply EMA smoothing to speed.
        const speedBps: number | null = rawSpeedBps !== null ? smoother.update(rawSpeedBps) : null;

        const etaMs: number | null =
          speedBps !== null && event.lengthComputable && event.total > 0
            ? ((event.total - event.loaded) / speedBps) * 1000
            : null;

        // Cap percent at 90 when minDuration is active (final 100% emitted after wait).
        let percent: number | null =
          event.lengthComputable && event.total > 0
            ? Math.round((event.loaded / event.total) * 100)
            : null;

        if (minDuration > 0 && percent !== null) {
          percent = Math.min(percent, 90);
        }

        const progress: DownloadProgress = {
          loaded: event.loaded,
          total: event.lengthComputable ? event.total : null,
          percent,
          lengthComputable: event.lengthComputable,
          speedBps,
          etaMs,
        };

        onProgress?.(progress);
      };

      // ── load: request completed (status may still indicate failure) ──────────
      xhr.onload = () => {
        // Validate HTTP status
        if (xhr.status < 200 || xhr.status >= 300) {
          onStateChange?.('failed');
          // Parse Retry-After header for 429 responses.
          const retryAfterMs =
            xhr.status === 429 || xhr.status === 503
              ? parseRetryAfterMs(xhr.getResponseHeader('Retry-After')) ?? undefined
              : undefined;
          const err = new HttpStatusError(xhr.status, xhr.statusText, retryAfterMs);
          reject(err);
          return;
        }

        // Validate response is a Blob
        const blob = xhr.response as unknown;
        if (!(blob instanceof Blob)) {
          onStateChange?.('failed');
          const err = new InvalidBlobResponseError();
          reject(err);
          return;
        }

        // Apply mimeType override if specified
        const finalBlob =
          mimeType && mimeType !== blob.type
            ? new Blob([blob], { type: mimeType })
            : blob;

        // Resolve filename: prefer explicit override, then Content-Disposition, then URL
        const contentDisposition = xhr.getResponseHeader('Content-Disposition') ?? undefined;
        const filename = resolveFilename(url, {
          filename: filenameOverride,
          contentDisposition,
        });

        // Apply minDuration delay before resolving (if configured).
        const finalize = (): void => {
          // Create object URL and trigger browser download
          const handle = createObjectUrl(finalBlob);
          const triggerResult = triggerDownload({
            blob: finalBlob,
            filename,
            objectUrl: handle.url,
            revokeDelay,
            autoRevoke,
          });

          const result: DownloadResult = {
            success: true,
            filename,
            blob: finalBlob,
            size: finalBlob.size,
            mimeType: finalBlob.type || 'application/octet-stream',
            clicked: triggerResult.clicked,
            revoked: triggerResult.revoked,
            cleanup: triggerResult.cleanup,
          };

          onStateChange?.('completed');
          onSuccess?.(result);
          resolve(result);
        };

        if (minDuration > 0) {
          waitMinDuration(downloadStartTime, minDuration, () => aborted)
            .then(() => {
              // Emit final 100% progress after minDuration wait.
              if (onProgress) {
                onProgress({
                  loaded: finalBlob.size,
                  total: finalBlob.size,
                  percent: 100,
                  lengthComputable: true,
                  speedBps: smoother.current(),
                  etaMs: 0,
                });
              }
              finalize();
            })
            .catch((err: unknown) => {
              // AbortDownloadError from waitMinDuration
              reject(err);
            });
        } else {
          finalize();
        }
      };

      // ── error: network-level failure ─────────────────────────────────────────
      xhr.onerror = () => {
        onStateChange?.('failed');
        reject(new NetworkError());
      };

      // ── timeout: request took too long ───────────────────────────────────────
      xhr.ontimeout = () => {
        onStateChange?.('failed');
        reject(new TimeoutError(timeout));
      };

      // ── abort: caller called task.abort() ────────────────────────────────────
      xhr.onabort = () => {
        onStateChange?.('aborted');
        reject(new AbortDownloadError());
      };

      // ── Configure and fire ───────────────────────────────────────────────────
      xhr.open('GET', url instanceof URL ? url.href : url);
      xhr.responseType = 'blob';
      xhr.timeout = timeout;
      xhr.withCredentials = withCredentials;

      if (headers) {
        for (const [key, value] of Object.entries(headers)) {
          xhr.setRequestHeader(key, value);
        }
      }

      xhr.send();
    });
  }

  // Resolve retry config and wire up the attempt factory.
  const retryOpts = resolveRetryConfig(retryConfig);

  const rawPromise: Promise<DownloadResult> = retryOpts
    ? withRetry(createAttempt, retryOpts, {
        onRetry,
        shouldAbort: () => aborted,
      })
    : createAttempt(0);

  // Fire onError only on final failure (after all retries exhausted)
  const resultPromise = rawPromise.catch((err: unknown) => {
    if (err instanceof AbortDownloadError) {
      onAbort?.();
    }
    onError?.(err as DownloadError);
    throw err;
  });

  return {
    promise: resultPromise,
    abort: () => {
      aborted = true;
      currentXhr.abort();
    },
    get xhr() {
      return currentXhr;
    },
  };
}
