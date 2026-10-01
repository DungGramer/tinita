export interface DownloadBlobOptions {
  /**
   * How long to keep the object URL alive before releasing it. 10000 by default.
   *
   * A delay is needed at all because `revokeObjectURL` immediately after `click()`
   * can cancel the download before the browser has started reading the blob. **No
   * number is correct** - it depends on the browser and on how fast the user's disk
   * answers a save dialog - so this is a timeout, not a guarantee. The version this
   * replaced hard-coded 100ms with a comment about Firefox and no way to change it.
   *
   * Pass `0` to revoke on the next task, or `Infinity` to never revoke and keep the
   * blob in memory until the document is discarded.
   */
  revokeAfterMs?: number;
}

/**
 * Prompt the browser to save `blob` as a file.
 *
 * Works by creating a detached `<a download>`, clicking it, and releasing the object
 * URL afterwards. The element is never inserted into the document, so it leaves no
 * trace in the DOM and no layout effect.
 *
 * **This is a request, not a guarantee.** The browser decides what happens: it may
 * save silently, open a dialog, display the file instead of saving it when it can
 * render that type, or ignore the click entirely if the call did not originate in a
 * user gesture. Nothing is observable from here, which is why this returns `void`
 * rather than a promise that would have to resolve on a lie. The version this
 * replaced returned the `<a>` element, which told the caller nothing.
 *
 * `download` is honoured only for a same-origin or `blob:` URL, which this always
 * is. A cross-origin URL would navigate instead.
 *
 * Takes a `Blob`, not raw data: wrapping is one call (`new Blob([text], { type })`),
 * and accepting both left the media type in two places. `tinita`'s converters
 * produce blobs directly.
 *
 * @throws {TypeError} if `blob` is not a `Blob`, or if `fileName` is empty.
 *
 * @example
 * ```ts
 * downloadBlob(new Blob(['a,b\n1,2'], { type: 'text/csv' }), 'report.csv');
 * downloadBlob(pdf, 'invoice.pdf', { revokeAfterMs: 60_000 });
 * ```
 */
export function downloadBlob(
  blob: Blob,
  fileName: string,
  options: DownloadBlobOptions = {}
): void {
  if (!(blob instanceof Blob)) {
    throw new TypeError(`downloadBlob: expected a Blob, got ${typeof blob}`);
  }
  if (typeof fileName !== 'string' || fileName === '') {
    throw new TypeError('downloadBlob: fileName must be a non-empty string');
  }

  const { revokeAfterMs = 10_000 } = options;
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.click();

  if (revokeAfterMs === Number.POSITIVE_INFINITY) return;

  setTimeout(() => URL.revokeObjectURL(url), Math.max(0, revokeAfterMs));
}
