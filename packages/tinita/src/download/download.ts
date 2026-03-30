import type { DownloadInput, DownloadOptions, DownloadResult } from './types';
import { DownloadError, DownloadErrorCode } from './errors';
import { detectInputType } from './detect-input-type';
import { downloadFromUrl } from './download-from-url';
import { downloadBlob } from './download-blob';
import { prepareDownload } from './prepare-download';
import { toBlob } from './to-blob';
import { resolveFilename } from './resolve-filename';

/**
 * Download any supported input as a file in the browser.
 *
 * This is the primary entry point for the download module. It automatically
 * detects the input type and selects the correct strategy:
 *
 * - **URL string / URL object** → delegates to `downloadFromUrl` (XHR with progress),
 *   awaiting `task.promise` for the result.
 * - **Blob, File, ArrayBuffer, Uint8Array, text string, data URL** → converts
 *   to Blob, then triggers the download via `downloadBlob`.
 *
 * When `onBeforeDownload` is provided for memory inputs, `prepareDownload` is
 * used so the hook receives the full `PreparedDownload` object. Returning `false`
 * from the hook aborts the download without error.
 *
 * Hook execution order:
 * 1. `onBeforeDownload(prepared)` — may abort by returning `false`
 * 2. *(download triggered)*
 * 3. `onAfterDownload(result)`
 *
 * On error, `onError` is called (if provided) and the error is NOT re-thrown.
 * Without `onError`, the error is re-thrown as a `DownloadError`.
 *
 * Note: For URL downloads with progress tracking or abort control, use
 * `downloadFromUrl()` directly — it returns a `DownloadTask`.
 *
 * @param input - Any supported download input.
 * @param options - Filename, MIME type, lifecycle hooks, and revoke settings.
 * @returns A `Promise` resolving to a `DownloadResult`.
 *
 * @throws {DownloadError} `BROWSER_ONLY`          — not in a browser context.
 * @throws {DownloadError} `INVALID_INPUT`          — unrecognised or unsupported input.
 * @throws {DownloadError} `BLOB_CREATION_FAILED`   — could not convert input to Blob.
 * @throws {HttpStatusError}                        — URL fetch returned a non-2xx status.
 * @throws {TimeoutError}                           — URL fetch timed out.
 * @throws {AbortDownloadError}                     — URL fetch was cancelled.
 * @throws {DownloadError} `TRIGGER_FAILED`         — browser download trigger failed.
 *
 * @example
 * // Blob
 * await download(new Blob(['hello, world'], { type: 'text/plain' }), {
 *   filename: 'hello.txt',
 * });
 *
 * @example
 * // Plain text string → downloaded as .txt
 * await download('col1,col2\n1,2', { filename: 'data.csv', mimeType: 'text/csv' });
 *
 * @example
 * // Remote URL — XHR fetch, then download
 * await download('https://example.com/report.pdf', { filename: 'report.pdf' });
 *
 * @example
 * // With hooks — cancel if file is too large
 * await download(largeBlob, {
 *   filename: 'dump.bin',
 *   onBeforeDownload: (prepared) => {
 *     if (prepared.size > 100_000_000) return false; // abort
 *   },
 *   onAfterDownload: (result) => console.log('Done:', result.filename),
 *   onError: (err) => console.error('Download failed:', err.code),
 * });
 */
export async function download(
  input: DownloadInput,
  options: DownloadOptions = {},
): Promise<DownloadResult> {
  const { onBeforeDownload, onAfterDownload, onError } = options;

  try {
    const inputType = detectInputType(input);

    // URL inputs → delegate to downloadFromUrl (XHR-based, returns DownloadTask)
    if (inputType === 'url-string' || inputType === 'url-object') {
      const task = downloadFromUrl(input as string | URL, options);
      return await task.promise;
    }

    // Memory inputs with onBeforeDownload hook → use prepareDownload for full
    // PreparedDownload object so the hook can inspect blob/size/objectUrl.
    if (onBeforeDownload) {
      const prepared = await prepareDownload(input, options);
      const shouldContinue = onBeforeDownload(prepared);
      if (shouldContinue === false) {
        prepared.cleanup();
        return {
          success: false,
          filename: prepared.filename,
          blob: prepared.blob,
          size: prepared.size,
          mimeType: prepared.mimeType,
          clicked: false,
          revoked: true,
          cleanup: () => undefined,
        };
      }
      const result = prepared.trigger();
      onAfterDownload?.(result);
      return result;
    }

    // Memory inputs without hook → convert to Blob and call downloadBlob directly
    const blob = await toBlob(input, options);
    const filename = resolveFilename(input, { filename: options.filename });
    const result = downloadBlob(blob, filename, {
      revokeDelay: options.revokeDelay,
      autoRevoke: options.autoRevoke,
    });

    onAfterDownload?.(result);
    return result;
  } catch (err) {
    const downloadErr = err instanceof DownloadError
      ? err
      : new DownloadError(
          `Download failed: ${err instanceof Error ? err.message : String(err)}`,
          DownloadErrorCode.TRIGGER_FAILED,
          err,
        );

    if (onError) {
      onError(downloadErr);
      return {
        success: false,
        filename: options.filename ?? 'download',
        blob: new Blob(),
        size: 0,
        mimeType: options.mimeType ?? 'application/octet-stream',
        clicked: false,
        revoked: true,
        cleanup: () => undefined,
      };
    }

    throw downloadErr;
  }
}
