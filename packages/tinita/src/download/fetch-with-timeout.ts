import { DownloadError, DownloadErrorCode } from './errors';
import { DEFAULT_FETCH_TIMEOUT } from './constants';
import { assertBrowser } from './env';

/**
 * Options for {@link fetchWithTimeout}.
 */
export interface FetchWithTimeoutOptions {
  /**
   * Request timeout in milliseconds.
   * When the timeout elapses before the response arrives the request is
   * aborted and a `DownloadError` with code `FETCH_TIMEOUT` is thrown.
   * @default DEFAULT_FETCH_TIMEOUT (30 000 ms)
   */
  timeout?: number;
  /**
   * An external `AbortSignal` to combine with the internal timeout signal.
   * If the external signal is already aborted the request is rejected
   * immediately with code `FETCH_ABORTED`.
   */
  signal?: AbortSignal;
  /**
   * Additional options forwarded verbatim to the underlying `fetch()` call.
   * The `signal` property in `fetchOptions` is ignored — use `options.signal`
   * instead.
   */
  fetchOptions?: Omit<RequestInit, 'signal'>;
}

/**
 * Fetch a URL with an automatic timeout and optional external abort signal.
 *
 * - Creates an internal `AbortController` wired to a `setTimeout`.
 * - Combines it with an optional external `AbortSignal` so either side can
 *   cancel the request.
 * - Validates `response.ok` and throws a typed `DownloadError` on failure.
 * - Always cleans up the timeout, even on success.
 *
 * @param url - The resource URL to fetch.
 * @param options - Timeout, abort signal, and additional fetch options.
 * @returns A `Promise` resolving to the validated `Response`.
 *
 * @throws {DownloadError} `FETCH_TIMEOUT`  — request exceeded `timeout` ms.
 * @throws {DownloadError} `FETCH_ABORTED`  — external signal aborted the request.
 * @throws {DownloadError} `FETCH_FAILED`   — network error or non-OK HTTP status.
 *
 * @example
 * // Default 30 s timeout
 * const response = await fetchWithTimeout('https://example.com/file.pdf');
 *
 * @example
 * // Custom timeout
 * const response = await fetchWithTimeout('https://example.com/file.pdf', {
 *   timeout: 5000,
 * });
 *
 * @example
 * // Combine with external AbortController
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 2000);
 * const response = await fetchWithTimeout('https://example.com/file.pdf', {
 *   signal: controller.signal,
 *   timeout: 10_000,
 * });
 */
export async function fetchWithTimeout(
  url: string | URL,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  assertBrowser('fetchWithTimeout');

  const { timeout = DEFAULT_FETCH_TIMEOUT, signal: externalSignal, fetchOptions = {} } = options;

  // Reject immediately if the external signal is already aborted
  if (externalSignal?.aborted) {
    throw new DownloadError(
      'Fetch was aborted before it started.',
      DownloadErrorCode.FETCH_ABORTED,
    );
  }

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // Wire external abort signal → internal controller
  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

  // Wire timeout → internal controller
  timeoutId = setTimeout(() => {
    controller.abort('timeout');
  }, timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new DownloadError(
        `Fetch failed: HTTP ${response.status} ${response.statusText}`,
        DownloadErrorCode.FETCH_FAILED,
      );
    }

    return response;
  } catch (err) {
    if (err instanceof DownloadError) throw err;

    // Distinguish timeout from external abort from generic network failure
    if (isAbortError(err)) {
      const reason = controller.signal.reason;
      if (reason === 'timeout') {
        throw new DownloadError(
          `Fetch timed out after ${timeout} ms.`,
          DownloadErrorCode.FETCH_TIMEOUT,
        );
      }
      throw new DownloadError(
        'Fetch was aborted.',
        DownloadErrorCode.FETCH_ABORTED,
      );
    }

    throw new DownloadError(
      `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      DownloadErrorCode.FETCH_FAILED,
    );
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

/** Determine whether an unknown thrown value is an AbortError. */
function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'AbortError' || err.name === 'DOMException')
  );
}
