import type { DownloadResult, DownloadBlobOptions } from '../types/download-types';
import { assertBrowser } from '../core/env';
import { createObjectUrl } from '../browser/create-object-url';
import { triggerDownload } from '../browser/trigger-download';

/**
 * Download a `Blob` as a file in the browser. Synchronous — no network request.
 *
 * Creates a temporary object URL, triggers the browser download via a hidden
 * anchor click, and schedules automatic revocation (unless `autoRevoke: false`).
 *
 * @param blob - The `Blob` (or `File`) to download
 * @param filename - Suggested filename shown in the browser save dialog
 * @param options - Optional revoke-delay and auto-revoke settings
 * @returns `DownloadResult` with status flags and a `cleanup` function
 *
 * @throws {DownloadError} `BROWSER_ONLY` when called outside a browser environment
 *
 * @example
 * const csv = new Blob(['id,name\n1,Alice'], { type: 'text/csv' });
 * const result = downloadBlob(csv, 'users.csv');
 * console.log(result.success);   // true
 * console.log(result.size);      // blob.size in bytes
 *
 * @example
 * // Disable auto-revoke to control cleanup timing manually
 * const result = downloadBlob(blob, 'data.bin', { autoRevoke: false });
 * // ... later:
 * result.cleanup();
 */
export function downloadBlob(
  blob: Blob,
  filename: string,
  options: DownloadBlobOptions = {},
): DownloadResult {
  assertBrowser('downloadBlob');

  const { revokeDelay, autoRevoke } = options;
  const handle = createObjectUrl(blob);

  const triggerResult = triggerDownload({
    blob,
    filename,
    objectUrl: handle.url,
    revokeDelay,
    autoRevoke,
  });

  return {
    success: true,
    filename,
    blob,
    size: blob.size,
    mimeType: blob.type || 'application/octet-stream',
    clicked: triggerResult.clicked,
    revoked: triggerResult.revoked,
    cleanup: triggerResult.cleanup,
  };
}
