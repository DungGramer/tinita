import { AbortDownloadError } from '../errors/download-errors';

/**
 * Wait until at least `minDuration` milliseconds have elapsed since `startTime`.
 *
 * - Resolves immediately if the elapsed time already meets or exceeds `minDuration`.
 * - Otherwise waits for the remaining time via `setTimeout`.
 * - Rejects with `AbortDownloadError` if `shouldAbort()` returns `true` during the wait.
 *   The abort is polled every 50 ms to avoid blocking the timer indefinitely.
 *
 * @param startTime - The reference timestamp in ms (typically `Date.now()` at start of download).
 * @param minDuration - Minimum total duration in ms.
 * @param shouldAbort - Optional predicate checked periodically during the wait.
 * @returns A promise that resolves when the minimum duration has elapsed.
 *
 * @example
 * const start = Date.now();
 * await doWork();
 * // Ensure at least 500ms have passed since start (e.g. for spinner UX).
 * await waitMinDuration(start, 500);
 *
 * @example
 * // With abort support
 * let aborted = false;
 * const task = downloadFromUrl(url);
 * task.promise.finally(() => { aborted = true; });
 * await waitMinDuration(start, 1000, () => aborted);
 */
export function waitMinDuration(
  startTime: number,
  minDuration: number,
  shouldAbort?: () => boolean,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const remaining = minDuration - (Date.now() - startTime);

    if (remaining <= 0) {
      resolve();
      return;
    }

    let timerId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;

    // Poll for abort during the wait window.
    intervalId = setInterval(() => {
      if (shouldAbort?.()) {
        clearInterval(intervalId);
        clearTimeout(timerId);
        reject(new AbortDownloadError());
      }
    }, 50);

    timerId = setTimeout(() => {
      clearInterval(intervalId);
      // Final abort check before resolving.
      if (shouldAbort?.()) {
        reject(new AbortDownloadError());
        return;
      }
      resolve();
    }, remaining);
  });
}
