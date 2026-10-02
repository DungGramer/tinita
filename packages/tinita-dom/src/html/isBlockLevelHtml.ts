import { assertString } from 'tinita/asserts/assertString';

/**
 * Block-level element names, uppercase to match `nodeName`.
 *
 * A fixed list rather than a computed one on purpose: `getComputedStyle(el).display`
 * would be the "real" answer but it depends on the page's own CSS, so the same
 * fragment would classify differently on different sites. This asks about HTML
 * semantics, which do not move.
 */
const BLOCK_LEVEL_NAMES = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DETAILS',
  'DIALOG',
  'DIV',
  'DL',
  'FIELDSET',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'FORM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HR',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'UL',
]);

/**
 * Whether the first element in an HTML fragment is block-level.
 *
 * Text before the first element is skipped; anything after it is ignored. A fragment
 * with no element at all is `false`.
 *
 * **Parses with `DOMParser`, never `innerHTML`.** That is the point of this
 * implementation, not a detail: assigning an untrusted string to `innerHTML` creates
 * the elements it describes, and `<img src=x onerror=...>` then runs the attacker's
 * code - even on a detached node, because the image still starts loading and still
 * fails. `DOMParser.parseFromString(html, 'text/html')` builds an inert document: no
 * scripts run and no resources are fetched.
 *
 * Note for anyone writing a test for this: **jsdom does not load resources**, so an
 * `onerror` payload stays dormant there whichever implementation is used. Measured
 * 2026-10-01. The guard is only observable in a real browser, which is why the proof
 * lives in the L4 lab case and not in the unit tests.
 *
 * @throws {TypeError} if `html` is not a string.
 *
 * @example
 * ```ts
 * isBlockLevelHtml('<p>a paragraph</p>');      // true
 * isBlockLevelHtml('<span>inline text</span>'); // false
 * isBlockLevelHtml('just text');                // false
 * ```
 */
export function isBlockLevelHtml(html: string): boolean {
  assertString(html, 'isBlockLevelHtml', 'html');

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const first = doc.body.firstElementChild;

  return first !== null && BLOCK_LEVEL_NAMES.has(first.nodeName);
}
