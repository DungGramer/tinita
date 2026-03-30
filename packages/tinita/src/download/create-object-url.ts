import { assertBrowser } from './env';
import { DEFAULT_REVOKE_DELAY } from './constants';

/**
 * A managed handle around a blob object URL with built-in cleanup utilities.
 */
export interface ObjectUrlHandle {
  /** The object URL string created from the blob. */
  url: string;
  /** Immediately revoke the object URL. Safe to call multiple times. */
  revoke: () => void;
  /**
   * Schedule revocation after a delay.
   *
   * @param delay - Milliseconds to wait before revoking. Defaults to DEFAULT_REVOKE_DELAY.
   */
  scheduleRevoke: (delay?: number) => void;
}

/**
 * Create a managed object URL from a Blob with guarded revocation.
 *
 * Wraps `URL.createObjectURL` and returns a handle that prevents double-revoke
 * and provides a scheduled-revoke convenience method.
 *
 * @param blob - The Blob to create an object URL for.
 * @returns An ObjectUrlHandle with the URL and cleanup methods.
 *
 * @throws {DownloadError} When called outside a browser environment.
 *
 * @example
 * const handle = createObjectUrl(new Blob(['hello'], { type: 'text/plain' }));
 * console.log(handle.url); // "blob:http://..."
 * handle.scheduleRevoke(); // revokes after DEFAULT_REVOKE_DELAY ms
 *
 * @example
 * const handle = createObjectUrl(blob);
 * anchor.href = handle.url;
 * handle.revoke(); // immediate cleanup
 */
export function createObjectUrl(blob: Blob): ObjectUrlHandle {
  assertBrowser('createObjectUrl');

  const url = URL.createObjectURL(blob);
  let revoked = false;

  const revoke = (): void => {
    if (revoked) return;
    revoked = true;
    URL.revokeObjectURL(url);
  };

  const scheduleRevoke = (delay: number = DEFAULT_REVOKE_DELAY): void => {
    setTimeout(revoke, delay);
  };

  return { url, revoke, scheduleRevoke };
}
