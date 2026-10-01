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
