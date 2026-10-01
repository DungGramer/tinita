/**
 * Whether the primary pointing device is coarse - a finger rather than a mouse.
 *
 * **This is the modern answer to "is this a touch device".** It asks the browser
 * about the input the user actually has, so it stays right when a phone ships with a
 * new user-agent string, when a tablet is docked with a mouse, and when someone
 * plugs a stylus into a laptop. The CSS equivalent is
 * `@media (pointer: coarse)`, and preferring that in CSS is better still - no
 * JavaScript, no re-render.
 *
 * `false` where `matchMedia` does not exist. It is not re-evaluated: call it again
 * when the answer matters, or subscribe to the query yourself for live updates.
 *
 * `isTouchDevice` answers a different question - "is a touchscreen present" - and a
 * laptop with a touchscreen is `true` there and `false` here.
 */
export function isCoarsePointer(): boolean {
  if (typeof matchMedia !== 'function') return false;

  return matchMedia('(pointer: coarse)').matches;
}
