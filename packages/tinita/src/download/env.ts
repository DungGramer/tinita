import { DownloadError, DownloadErrorCode } from './errors';

/**
 * Returns `true` when running in a browser environment (window + document available).
 * Safe to call on the server — always returns `false` in SSR/Node contexts.
 *
 * @returns `true` if `window` and `document` are defined, `false` otherwise.
 *
 * @example
 * if (isBrowser()) {
 *   // safe to access window / document
 * }
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Asserts that the current environment is a browser.
 * Throws a `DownloadError` with code `BROWSER_ONLY` when called on the server.
 *
 * @param operation - Human-readable name of the calling operation, used in the error message.
 * @throws {DownloadError} When called outside a browser environment.
 *
 * @example
 * function downloadBlob(blob: Blob, filename: string): void {
 *   assertBrowser('downloadBlob');
 *   // safe to use document here
 * }
 */
export function assertBrowser(operation: string): void {
  if (!isBrowser()) {
    throw new DownloadError(
      `${operation} requires a browser environment`,
      DownloadErrorCode.BROWSER_ONLY,
    );
  }
}

/**
 * Returns `true` if the browser supports the `download` attribute on anchor elements.
 * Safe to call on the server — always returns `false` in SSR/Node contexts.
 *
 * @returns `true` if `<a download>` is supported, `false` otherwise.
 *
 * @example
 * if (supportsDownloadAttribute()) {
 *   anchor.setAttribute('download', filename);
 *   anchor.click();
 * } else {
 *   // fallback strategy
 * }
 */
export function supportsDownloadAttribute(): boolean {
  if (!isBrowser()) return false;
  return 'download' in document.createElement('a');
}

/**
 * Returns `true` if the browser exposes `navigator.msSaveOrOpenBlob` (IE / legacy Edge).
 * Safe to call on the server — always returns `false` in SSR/Node contexts.
 *
 * @returns `true` if `navigator.msSaveOrOpenBlob` is a function, `false` otherwise.
 *
 * @example
 * if (supportsMsSaveBlob()) {
 *   (navigator as any).msSaveOrOpenBlob(blob, filename);
 * }
 */
export function supportsMsSaveBlob(): boolean {
  if (!isBrowser()) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof (navigator as any).msSaveOrOpenBlob === 'function';
}
