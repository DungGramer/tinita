/**
 * Platform guesses read off `navigator.userAgent`.
 *
 * **Every function in this file is a heuristic and can be wrong.** They are kept as
 * a fallback, not as the first answer:
 *
 * - Chrome froze its user-agent string, so these cannot learn about new platforms.
 * - A user-agent is trivially spoofed, so **never** use one of these to decide
 *   anything about security, entitlement, or billing.
 * - For layout and input questions, `isCoarsePointer` and `isTouchDevice` measure the
 *   real capability and do not rot. Prefer them.
 * - For precise, structured platform data in Chromium, `navigator.userAgentData`
 *   exists and is not a string to parse.
 *
 * Use these for a hint: which keyboard shortcut to render, which app-store badge to
 * show, which install instructions to put first.
 */

const userAgent = (): string =>
  typeof navigator === 'undefined' ? '' : navigator.userAgent;

/**
 * Guess iOS, including an iPad reporting itself as a Mac.
 *
 * iPadOS 13 and later send a desktop Mac user-agent, so a Mac string plus touch
 * support is treated as an iPad. The consequence: a **Mac with a touchscreen** would
 * be a false positive, which Apple does not sell today.
 *
 * Reads `document`, so it cannot run in a worker.
 */
export function isIOS(): boolean {
  const agent = userAgent();
  const iPadAsMac =
    agent.includes('Mac') &&
    typeof document !== 'undefined' &&
    'ontouchend' in document;

  return iPadAsMac || /iPad|iPhone|iPod/.test(agent);
}

/**
 * Guess that the page is inside an iOS web view rather than a browser tab.
 *
 * Inferred by elimination - iOS, and not Safari, and not a known third-party
 * browser - so it is the least reliable function here. A new iOS browser that does
 * not advertise itself would read as a web view.
 *
 * Useful to explain why a download or a share sheet will not work; not useful as a
 * gate.
 */
export function isIOSWebView(): boolean {
  const agent = userAgent();
  if (!/iPad|iPhone|iPod/.test(agent)) return false;
  if (/CriOS|FxiOS|OPiOS|EdgiOS/.test(agent)) return false;

  return !/Safari/.test(agent);
}

/**
 * Guess Android.
 *
 * Note that an Android **tablet** is also `true` here: this is the operating system,
 * not the form factor. For form factor use `isCoarsePointer`.
 */
export function isAndroid(): boolean {
  return /Android/i.test(userAgent());
}

/**
 * Guess a phone-sized device from the user-agent string.
 *
 * `isCoarsePointer` is the better question and the one to reach for first; this
 * exists for the case where a platform name is genuinely what you need. Note what it
 * gets wrong: an iPad running iPadOS 13+ sends a Mac string and reads `false`, and
 * any device whose vendor changes its string in future reads `false` too.
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(
    userAgent()
  );
}

/** Guess Windows. */
export function isWindows(): boolean {
  return /Win/.test(userAgent());
}

/**
 * Guess macOS.
 *
 * `true` for an iPad on iPadOS 13+, which sends a Mac string. Combine with
 * `isIOS()` if the two must be told apart.
 */
export function isMacOS(): boolean {
  return /Mac/i.test(userAgent());
}
