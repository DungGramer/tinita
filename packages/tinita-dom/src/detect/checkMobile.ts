export function isIOS() {
  return (
    // iPad on iOS 13+ detection
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document) ||
    // Other iOS device detection
    /iPad|iPhone|iPod/.test(navigator.userAgent)
  );
}

export function isIOSWebView() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
  return isIOS && !isSafari && !/CriOS|FxiOS|OPiOS/.test(ua);
}

export function isMobile() {
  const toMatch = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
  ];

  return toMatch.some((toMatchItem) => {
    return navigator.userAgent.match(toMatchItem);
  });
}

export function isAndroid() {
  return !!navigator.userAgent.match(/Android/i);
}

/**
 * Whether the device reports touch support.
 *
 * `msMaxTouchPoints` is read through a cast: it is the IE 10 spelling, long gone
 * from the Navigator type, and reading it still helps on a few old devices.
 *
 * The version this replaced also called `isWindows()`, which was never defined
 * anywhere in the package - every call threw ReferenceError. Excluding Windows was
 * wrong anyway: a Surface and most modern laptops are both Windows and touch.
 */
export function isTouchDevice() {
  const legacyTouchPoints = (
    navigator as Navigator & { msMaxTouchPoints?: number }
  ).msMaxTouchPoints;

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (legacyTouchPoints ?? 0) > 0
  );
}
