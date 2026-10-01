/**
 * Browser-engine guesses read off `navigator.userAgent` and `navigator.vendor`.
 *
 * **Heuristics, kept as a fallback.** Browser sniffing has the same problem as
 * platform sniffing and one more: engines deliberately impersonate each other. Edge
 * contains `Chrome` and `Safari` in its string; Chrome contains `Safari`. The order
 * of the checks here matters because of that, and the next engine to ship will not
 * be in this file.
 *
 * Prefer feature detection. If a specific browser genuinely needs a workaround,
 * detect the broken behaviour rather than the name.
 *
 * `false` everywhere `navigator` does not exist.
 */

const userAgent = (): string =>
  typeof navigator === 'undefined' ? '' : navigator.userAgent;

const vendor = (): string =>
  typeof navigator === 'undefined' ? '' : navigator.vendor;

/**
 * Guess Chrome, excluding the Chromium browsers that carry `Chrome` in their string.
 *
 * Edge, Opera and Brave all advertise `Chrome`, and Edge also reports
 * `Google Inc` as its vendor - so the vendor check alone is not enough. The version
 * this replaced tested only `Chrome` plus `Google Inc` and so reported Edge as
 * Chrome.
 */
export function isChrome(): boolean {
  const agent = userAgent();
  if (/Edg|OPR|Opera/.test(agent)) return false;

  return /Chrome/.test(agent) && /Google Inc/.test(vendor());
}

/**
 * Guess Firefox.
 *
 * `InstallTrigger` was Firefox's old tell. It is not a declared global, and Firefox
 * removed it in 2023, so it is read off `globalThis` as a fallback rather than
 * referenced bare - a bare reference is a `ReferenceError` under `noImplicitAny` and
 * does nothing for current Firefox anyway.
 */
export function isFirefox(): boolean {
  const hasInstallTrigger =
    (globalThis as { InstallTrigger?: unknown }).InstallTrigger !== undefined;

  return /Firefox/.test(userAgent()) || hasInstallTrigger;
}

/**
 * Guess desktop or iOS Safari.
 *
 * Chromium browsers all carry `Safari` in their user-agent string, so they are
 * excluded by name before the vendor check runs. `CriOS` is in that list because
 * Chrome on iOS is WebKit underneath and does not advertise `Chrome`.
 */
export function isSafari(): boolean {
  const agent = userAgent();
  if (/Chrome|CriOS|Chromium|Edg|OPR/.test(agent)) return false;

  return /Safari/.test(agent) && /Apple Computer/.test(vendor());
}

/**
 * Guess Edge.
 *
 * Matches both spellings: `Edge` was the EdgeHTML original, `Edg` is Chromium-based
 * Edge. The version this replaced tested only `Edge`, so it missed every Edge
 * shipped since 2020.
 */
export function isEdge(): boolean {
  return /Edge?\//.test(userAgent()) || /Edg/.test(userAgent());
}

/**
 * Guess Internet Explorer.
 *
 * Matches IE 11 too, which dropped `MSIE` from its string in favour of `Trident` -
 * so the version this replaced reported `false` for the last IE anyone shipped.
 * IE reached end of support in 2022; this is here for legacy intranet pages.
 */
export function isIE(): boolean {
  const agent = userAgent();

  return /MSIE/.test(agent) || /Trident\//.test(agent);
}
