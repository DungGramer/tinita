/**
 * The width and height the scrollbars occupy, in CSS pixels, as `[width, height]`.
 *
 * `[0, 0]` where scrollbars are overlays that take no space - macOS by default, and
 * every mobile browser. A non-zero width is the classic Windows-style gutter, and it
 * is what a modal needs to compensate for when it hides the body scrollbar.
 *
 * Measured, not assumed: it inserts a hidden 100x100 probe into `document.body`,
 * compares an inner element before and after switching the probe to
 * `overflow: scroll`, then removes the probe. The probe is `visibility: hidden` and
 * absolutely positioned at the origin, so it never affects layout or paint.
 *
 * Call it when you need the number, not at module load. It **reads layout**, so it
 * forces a synchronous reflow; calling it in a loop or a scroll handler is a
 * performance mistake. Cache the result and recompute only on a resize, since the
 * value changes when the user moves the window to a screen with different settings
 * or changes the OS scrollbar preference.
 *
 * Requires `document.body` to exist, so it cannot run at the top of a module
 * evaluated in `<head>`, nor during SSR.
 *
 * In an environment with no layout engine the probe measures zero, so the result is
 * `[0, 0]`. Measured 2026-10-01: jsdom reports `offsetHeight` 0 for everything, so a
 * unit test here can only assert the shape. The real value is only observable in a
 * browser, which is the L4 lab.
 *
 * @example
 * ```ts
 * const [scrollbarWidth] = getScrollbarSize();
 * document.body.style.paddingRight = `${scrollbarWidth}px`;
 * ```
 */
export function getScrollbarSize(): [number, number] {
  const inner = document.createElement('p');
  inner.style.width = '100%';
  inner.style.height = '100%';

  const outer = document.createElement('div');
  outer.style.position = 'absolute';
  outer.style.top = '0px';
  outer.style.left = '0px';
  outer.style.visibility = 'hidden';
  outer.style.width = '100px';
  outer.style.height = '100px';
  outer.style.overflow = 'hidden';
  outer.appendChild(inner);

  document.body.appendChild(outer);

  const w1 = inner.offsetWidth;
  const h1 = inner.offsetHeight;
  outer.style.overflow = 'scroll';
  let w2 = inner.offsetWidth;
  let h2 = inner.offsetHeight;

  if (w1 === w2) w2 = outer.clientWidth;
  if (h1 === h2) h2 = outer.clientHeight;

  document.body.removeChild(outer);

  return [w1 - w2, h1 - h2];
}
