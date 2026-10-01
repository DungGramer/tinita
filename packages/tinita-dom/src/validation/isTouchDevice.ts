/**
 * Whether a touchscreen is present.
 *
 * Feature detection, not a guess: it reads capabilities the browser reports rather
 * than parsing a user-agent string, so it does not rot when a vendor changes that
 * string.
 *
 * It answers "is a touchscreen present", **not** "is this a phone". A Surface and
 * most current laptops are `true`. For "should I lay this out for a finger", use
 * `isCoarsePointer`, or `@media (pointer: coarse)` in CSS, which is better still.
 *
 * `msMaxTouchPoints` is read through a cast: it is the IE 10 spelling, long gone
 * from the `Navigator` type, and reading it still helps on a few old devices.
 *
 * The version this replaced also called `isWindows()`, which was never defined
 * anywhere in the package - every call threw `ReferenceError`. Excluding Windows was
 * wrong anyway, for the reason above.
 */
export function isTouchDevice(): boolean {
  // Both counters are read through `?? 0`. `maxTouchPoints` is typed `number` but is
  // genuinely absent in some environments - measured 2026-10-01, jsdom leaves it
  // `undefined` - and `undefined > 0` happens to be false, so the type was lying
  // without anything failing.
  const { maxTouchPoints, msMaxTouchPoints } = navigator as Navigator & {
    maxTouchPoints?: number;
    msMaxTouchPoints?: number;
  };

  return (
    'ontouchstart' in window ||
    (maxTouchPoints ?? 0) > 0 ||
    (msMaxTouchPoints ?? 0) > 0
  );
}
