import type { DownloadInput, DownloadOptions, PreparedDownload, DownloadResult } from './types';
import { DownloadError, DownloadErrorCode } from './errors';
import { toBlob } from './to-blob';
import { resolveFilename } from './resolve-filename';
import { createObjectUrl } from './create-object-url';
import { triggerDownload } from './trigger-download';

/**
 * Prepare a download without triggering it.
 *
 * Converts the input to a Blob, resolves a filename, and creates an object URL —
 * but does NOT click the anchor. Useful for showing a confirmation dialog or
 * file-size preview before the user commits to the download.
 *
 * **Memory management:** The returned object URL lives until you call either
 * `trigger()` (which auto-revokes per `options.autoRevoke`) or `cleanup()`.
 * Always call one of these to avoid memory leaks.
 *
 * @param input - Any supported download input (Blob, File, ArrayBuffer, string, etc.).
 * @param options - Optional filename, MIME type, BOM flag, hooks, and revoke settings.
 * @returns A `PreparedDownload` with metadata and `trigger()` / `cleanup()` methods.
 *
 * @throws {DownloadError} `BROWSER_ONLY` when called outside a browser environment.
 * @throws {DownloadError} `INVALID_INPUT` when the input cannot be converted to a Blob.
 * @throws {DownloadError} `BLOB_CREATION_FAILED` when Blob construction fails.
 *
 * @example
 * const prepared = await prepareDownload(csvData, { filename: 'report.csv' });
 * console.log(`File size: ${prepared.size} bytes`);
 *
 * // User confirms in dialog...
 * const result = prepared.trigger();
 * console.log(result.success); // true
 *
 * @example
 * // Cancel without downloading
 * const prepared = await prepareDownload(blob);
 * prepared.cleanup(); // releases object URL
 */
export async function prepareDownload(
  input: DownloadInput,
  options: DownloadOptions = {},
): Promise<PreparedDownload> {
  const { mimeType, inputType, addBom, revokeDelay, autoRevoke } = options;

  let blob: Blob;
  try {
    blob = await toBlob(input, { mimeType, inputType, addBom });
  } catch (err) {
    if (err instanceof DownloadError) throw err;
    throw new DownloadError(
      `Failed to create Blob: ${err instanceof Error ? err.message : String(err)}`,
      DownloadErrorCode.BLOB_CREATION_FAILED,
      err,
    );
  }

  const filename = resolveFilename(input, { filename: options.filename });
  const handle = createObjectUrl(blob);

  const resolvedMimeType = blob.type || 'application/octet-stream';
  const size = blob.size;

  const cleanup = (): void => {
    handle.revoke();
  };

  const trigger = (): DownloadResult => {
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
      size,
      mimeType: resolvedMimeType,
      clicked: triggerResult.clicked,
      revoked: triggerResult.revoked,
      cleanup: triggerResult.cleanup,
    };
  };

  return {
    blob,
    filename,
    objectUrl: handle.url,
    mimeType: resolvedMimeType,
    size,
    trigger,
    cleanup,
  };
}
