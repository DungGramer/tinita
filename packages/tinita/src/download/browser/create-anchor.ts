import { assertBrowser } from '../core/env';

/**
 * Configuration for creating a download anchor element.
 */
export interface AnchorConfig {
  /** The href attribute value (typically an object URL or data URL). */
  href: string;
  /** The suggested filename for the downloaded file. */
  filename: string;
  /**
   * Open in a new tab instead of triggering a download.
   * Useful for browsers that do not support the `download` attribute.
   */
  newTab?: boolean;
}

/**
 * Create a configured anchor element for file download.
 *
 * Creates the element but does NOT append it to the DOM — the caller
 * is responsible for insertion, clicking, and removal.
 *
 * @param config - Anchor configuration.
 * @returns A configured HTMLAnchorElement ready to be appended and clicked.
 *
 * @throws {DownloadError} When called outside a browser environment.
 *
 * @example
 * const anchor = createAnchor({ href: objectUrl, filename: 'report.pdf' });
 * document.body.appendChild(anchor);
 * anchor.click();
 * anchor.remove();
 *
 * @example
 * // Open in new tab (fallback for unsupported browsers)
 * const anchor = createAnchor({ href: url, filename: 'data.csv', newTab: true });
 */
export function createAnchor(config: AnchorConfig): HTMLAnchorElement {
  assertBrowser('createAnchor');

  const { href, filename, newTab = false } = config;

  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.style.display = 'none';

  if (newTab) {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }

  return anchor;
}
