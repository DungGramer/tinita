# tinita-dom

Framework-agnostic DOM utilities. **Browser-only** - see below.

Zero dependencies. Zero peer dependencies. No React required.

## Install

```bash
npm install tinita-dom
```

## Browser-only, and that is deliberate

This package touches `document`, `window.matchMedia`, `requestAnimationFrame` and `getComputedStyle`.
There is **no SSR guard**, and that is a decision rather than an oversight: `installSmoothScroll`
attaches listeners to `document`, and on the server there is nothing to attach them to, so calling it
there is the caller's mistake.

A silent guard would turn an obvious error into "why isn't smooth scroll working". Call it inside a
`useEffect`, or once you know you are in a browser.

## `installSmoothScroll`

One app-wide `wheel` listener, so individual scrollers never have to ask for smoothing.

```ts
import { installSmoothScroll } from 'tinita-dom/smooth-scroll';

// Call it ONCE, outside React. This is document-level work that no component owns, and
// StrictMode's double-invoked effects would install it twice.
const uninstall = installSmoothScroll();

// When you need to remove it (tests, hot reload):
uninstall();
```

Two behaviours, and they are separate things:

1. **Detented wheels are eased** on exactly the element the browser would have scrolled anyway. Same
   element, same distance, same end point.
2. **A vertical wheel over an element that can only scroll HORIZONTALLY scrolls it horizontally.** The
   browser does not do this, and `Shift+wheel` is the answer most users never think of.

Input that is already smooth (Mos, SmoothScroll, Mac Mouse Fix, or a trackpad) is left to the browser
in case 1 - smoothing something already smooth is exactly what makes a page feel like it lags behind
your hand.

### What it deliberately does NOT touch

- A wheel event an inner handler already claimed (checked via `defaultPrevented`). The listener sits on
  `document` in the **bubble** phase, not capture, so wheel-to-zoom or a map's scroll-zoom runs first
  and this yields to it.
- `Ctrl+wheel` - that is browser zoom.
- A wheel event that already has `deltaX` - a trackpad swiping sideways already scrolls sideways.
- Any subtree carrying `data-no-smooth-scroll` - the explicit opt-out.
- Anyone who has `prefers-reduced-motion` enabled.

## `wheel-source`

Classifies the source of a wheel event from the event stream itself, not by sniffing for installed
apps.

```ts
import {
  classifyWheelSource,
  WHEEL_SAMPLE_COUNT,
} from 'tinita-dom/wheel-source';
```

This is a public subpath rather than an internal detail: it is zero-dependency, and the constants in
it (`WHEEL_STEP_MIN_PIXELS`, `WHEEL_REPEAT_SHARE`, ...) are measured numbers, each dated in a comment.
Changing them is a breaking change.

## Imports

```ts
import { installSmoothScroll } from 'tinita-dom/smooth-scroll'; // recommended
import { classifyWheelSource } from 'tinita-dom/wheel-source'; // recommended
import { installSmoothScroll } from 'tinita-dom'; // barrel, pulls in both modules
```

## Origin

Ported from `apps/iva-service/web/src/lib/` in deepstream-v2, where it runs in production. Comments
carrying measurements and dates are kept verbatim - they cannot be reproduced.
