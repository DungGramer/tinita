import { assertBrowser, supportsMsSaveBlob } from './env';
import { DEFAULT_REVOKE_DELAY } from './constants';
import { createAnchor } from './create-anchor';

/**
 * Configuration for triggering a file download.
 */
export interface TriggerDownloadConfig {
  /** The Blob to download (used for msSaveOrOpenBlob fallback). */
  blob: Blob;
  /** The suggested filename for the downloaded file. */
  filename: string;
  /** Object URL pointing to the blob (used for anchor strategy). */
  objectUrl: string;
  /**
   * Milliseconds before the object URL is revoked after download.
   * Defaults to DEFAULT_REVOKE_DELAY.
   */
  revokeDelay?: number;
  /**
   * Whether to automatically revoke the object URL after the download is triggered.
   * @default true
   */
  autoRevoke?: boolean;
}

/**
 * Result of a triggered download operation.
 */
export interface TriggerResult {
  /** Whether the anchor click (or msSaveOrOpenBlob) was invoked. */
  clicked: boolean;
  /** Whether the object URL was revoked synchronously during the trigger. */
  revoked: boolean;
  /**
   * Cleanup function that revokes the object URL (if not already revoked)
   * and removes the anchor from the DOM (if still attached).
   */
  cleanup: () => void;
}

/**
 * Trigger a file download using the most appropriate browser strategy.
 *
 * Strategy 1 (legacy IE/old Edge): `navigator.msSaveOrOpenBlob`
 * Strategy 2 (modern browsers): create hidden anchor, click, schedule removal
 *
 * @param config - Download trigger configuration.
 * @returns A TriggerResult with status flags and a cleanup function.
 *
 * @throws {DownloadError} When called outside a browser environment.
 *
 * @example
 * const result = triggerDownload({
 *   blob: new Blob(['hello'], { type: 'text/plain' }),
 *   filename: 'hello.txt',
 *   objectUrl: URL.createObjectURL(blob),
 * });
 * console.log(result.clicked); // true
 * // cleanup is called automatically via autoRevoke, or manually:
 * result.cleanup();
 *
 * @example
 * // Disable auto-revoke to control timing manually
 * const result = triggerDownload({ blob, filename, objectUrl, autoRevoke: false });
 * setTimeout(() => result.cleanup(), 60_000);
 */
export function triggerDownload(config: TriggerDownloadConfig): TriggerResult {
  assertBrowser('triggerDownload');

  const {
    blob,
    filename,
    objectUrl,
    revokeDelay = DEFAULT_REVOKE_DELAY,
    autoRevoke = true,
  } = config;

  let anchorRef: HTMLAnchorElement | null = null;
  let urlRevoked = false;

  const revokeUrl = (): void => {
    if (urlRevoked) return;
    urlRevoked = true;
    URL.revokeObjectURL(objectUrl);
  };

  const cleanup = (): void => {
    revokeUrl();
    if (anchorRef && anchorRef.parentNode) {
      anchorRef.parentNode.removeChild(anchorRef);
      anchorRef = null;
    }
  };

  // Strategy 1: Legacy IE / old Edge
  if (supportsMsSaveBlob()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).msSaveOrOpenBlob(blob, filename);

    if (autoRevoke) {
      setTimeout(revokeUrl, revokeDelay);
    }

    return { clicked: true, revoked: false, cleanup };
  }

  // Strategy 2: Hidden anchor click
  const anchor = createAnchor({ href: objectUrl, filename });
  anchorRef = anchor;

  document.body.appendChild(anchor);
  anchor.click();

  // Remove anchor after click completes (some browsers need a tick)
  setTimeout(() => {
    if (anchor.parentNode) {
      anchor.parentNode.removeChild(anchor);
    }
    if (anchorRef === anchor) {
      anchorRef = null;
    }
  }, 0);

  if (autoRevoke) {
    setTimeout(revokeUrl, revokeDelay);
  }

  return { clicked: true, revoked: false, cleanup };
}
