# Tinita

A monorepo of framework-agnostic utilities, React hooks and UI components, with Storybook.

**Packages:** `tinita` (v0.1.0, 52 subpaths) · `tinita-dom` (v0.1.0, 22 subpaths, browser-only) · `tinita-react` (v0.1.0, 13 subpaths + 4 CSS entries)

---

## Quick start

```bash
pnpm install      # install dependencies
pnpm build        # build everything
pnpm test         # run the test suites
pnpm storybook    # browse the components
pnpm gate         # format, lint, types, build, test, stories, L1 (~90s)
```

---

## Packages

### tinita (v0.1.0)

**52 subpaths.** It runs everywhere - Node and browser - and that is the rule that decides what
belongs here rather than in `tinita-dom`: ask whether the function means anything without a document.
`stringToBase64` on a server does; `getScrollbarSize` does not.

| Folder        | What is in it                                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `array/`      | `createRange`, `getArrayValue`, `prependUnique`, `sortAlphaText`, `uniqueArray`                                                   |
| `asserts/`    | 8 assertion primitives - `assertString`, `assertArray`, `assertFiniteNumber`, `assertObject`, and 4 more. See Validation below    |
| `converter/`  | base64 and Blob conversions, `objectToFormData`, `parseKeyCombination`, the Map/object pair                                       |
| `date/`       | `sortDates`                                                                                                                       |
| `file/`       | `fileSize`, `getFileNameParts`, `truncateFileName`, `truncateFileNameParts`                                                       |
| `html/`       | `html.encode` / `html.decode` / `html.extend`, plus the 1510-entity plugin                                                        |
| `mime/`       | `mime.fromExtension`, `.toExtension`, `.acceptToRegExp`, plus the full table plugin                                               |
| `object/`     | `pick`, `omit`, `once`, `enumKeys`, `sortObjectKeys`, `conditionalEntry`, `omitEmptyValues`                                       |
| `print/`      | `PAGE_SIZES` (ISO 216/217), `PHOTO_PRINT_SIZES`, `DEFAULT_PRINT_MARGINS`                                                          |
| `string/`     | `titleCase`, `sentenceCase`, `snakeToTitleCase`, `collapseWhitespace`, `insertTextEveryNWords`, `stringToSelector`                |
| `unit/`       | `convertLength` - CSS absolute units, exact spec ratios, no DOM; `printPixels` - physical length to raster pixels at a chosen DPI |
| `uuid/`       | `generateUuid`                                                                                                                    |
| `validation/` | `isEmail`, `isUrl`, `isNumericString`, `isAsciiLetters`, `hasVietnameseDiacritics`                                                |

```typescript
import { truncateFileName } from 'tinita/file/truncateFileName';
import { stringToBase64 } from 'tinita/converter/stringToBase64';
import { mime } from 'tinita/mime';
```

Zero dependencies, zero peer dependencies. The barrel import (`from 'tinita'`) works too, and unlike
`tinita-react` it carries no optional-peer surprise.

Two tables are opt-in rather than bundled, because `bundle: true` inlines whatever is imported into
every entry that imports it: `tinita/html/plugin/entities` (1510 named entities) and
`tinita/mime/plugin/full` (1015 media types, 71KB of output). Apply either with `.extend()`, after
dayjs:

```typescript
import { mime } from 'tinita/mime';
import { full } from 'tinita/mime/plugin/full';

mime.extend(full);
```

### tinita-react (v0.1.0)

Nine hooks and five UI components, CSS included. **Import specific subpaths rather than the barrel** -
see the note under the peer table for why.

```typescript
// Hook
import { useToggle } from 'tinita-react/hooks/useToggle';

// Components
import { Tree } from 'tinita-react/ui/tree';
import { FileTree } from 'tinita-react/ui/file-tree';
import { Ping } from 'tinita-react/ui/ping';
import { CarouselTicker } from 'tinita-react/ui/carousel-ticker';
import { FloatingWindow } from 'tinita-react/ui/floating-window';

// The two hooks behind FloatingWindow, usable on their own
import { useDragSnap } from 'tinita-react/hooks/useDragSnap';
import { useWindowDrag } from 'tinita-react/hooks/useWindowDrag';

// Utility. `autoInjectStyles(styleId, cssContent)` is an escape hatch for consumers whose
// bundler cannot import CSS: it injects a CSS string at the START of <head> so the host can
// still override it, and returns a remover. The main path is the `ui/*` entries above, which
// pull their own CSS through the import graph.
import { autoInjectStyles } from 'tinita-react/utils/autoInjectStyles';

// CSS
import 'tinita-react/styles.css';
```

#### Install per component

`tinita-react` has **no `dependencies`**. Any library that only part of the package needs is an
**optional peer**, so you install only what the components you import actually use.

| Import                            | Also install                      |
| --------------------------------- | --------------------------------- |
| `tinita-react/ui/ping`            | nothing                           |
| `tinita-react/ui/carousel-ticker` | nothing                           |
| `tinita-react/ui/floating-window` | nothing                           |
| `tinita-react/hooks/*`            | nothing                           |
| `tinita-react/utils/*`            | nothing                           |
| `tinita-react/ui/tree`            | `@base-ui/react`                  |
| `tinita-react/ui/file-tree`       | `@base-ui/react` + `lucide-react` |

`react >=18` and `react-dom >=18` are required peers for every entry point. `react-dom` is there
for `FloatingWindow`, which portals into `document.body` - a window rendered inside the app's own
tree is trapped by any ancestor that creates a stacking context, and `position: fixed` does not
escape a transformed parent.

#### Keyboard shortcuts

Nothing is bound by default. A floating window is not a modal, so a hardcoded `Escape`
would throw away whatever you were doing in it, and no single key is right for every
application. Bind what you want:

```tsx
<FloatingWindow
  open={open}
  onOpenChange={setOpen}
  title="Dashboard"
  keyBindings={{
    close: 'Escape',
    minimize: ['Ctrl+M', 'Cmd+M'],
    maximize: 'F11',
  }}
>
  {/* ... */}
</FloatingWindow>
```

The syntax is `tinita/converter/parseKeyCombination`'s, so `ctrl`, `cmd`, `⌘`, `option`
and `win` are all understood, and an array binds several combinations to one action.

**One binding, the right key on both platforms.** Control and Command are swapped to
match the platform, so `minimize: 'Ctrl+M'` fires on Control under Windows and Linux and
on Command on a Mac - the listener, not only the label. It is the `Mod` convention,
applied without a keyword. Name both yourself and nothing is touched:
`['Ctrl+M', 'Cmd+M']` keeps exactly those two everywhere. Combinations with neither
modifier, like `F11` or `Escape`, are never remapped.

The surprising half: on a Mac a lone `'Ctrl+M'` _becomes_ Command, so Control+M stops
firing there. Bind both if you want both.

**The controls advertise what you bound.** Hovering minimise shows `Minimize (Ctrl + M)`,
or `Minimize (⌘M)` on an Apple keyboard - Apple's own style, concatenated, with glyphs
for the named keys, so `Alt+Cmd+Escape` reads `⌥⌘⎋` there and `Alt + Win + Escape`
elsewhere. Keys with no established Apple glyph are left as written, which is what macOS
does too: `F11` stays `F11`. The shortcut shown is the mapped one, so it is always a key
that fires. The combination shown is picked from your
bindings by platform rather than translated into them: bind `['Ctrl+M', 'Cmd+M']` and a
Mac shows the Command one, bind only `'Ctrl+M'` and a Mac shows `⌃ + M`, because Control
is still the key that fires there. The action name stays in `aria-label` and every bound
combination goes in `aria-keyshortcuts`, which is the attribute ARIA defines for it.

Two behaviours worth knowing. A **bare printable key is ignored while the focus is in a
text field** - binding `m` to minimise would otherwise fire on every `m` typed into an
input. Anything with a modifier, and named keys such as `Escape` or `F2`, still fire
there. And keys pressed **inside a cross-origin iframe never arrive**, which is the same
boundary the window's pointer shields exist for.

**React 18 is a hard floor, not a preference.** `Tree` and `useWindowSize` are built on
`useSyncExternalStore`, which React added in 18, so there is no version of this package that runs on 17. React 18 and 19 are both built and exercised in a real Chromium by the compatibility lab
(`compatibility/cases/l4`): a production `next build`, a mounted page, and a check that the browser
console reports no hydration error. Measured on 18.3.1 and 19.

```bash
npm install tinita-react                                # Ping, CarouselTicker, hooks
npm install tinita-react @base-ui/react                 # adds Tree
npm install tinita-react @base-ui/react lucide-react    # adds FileTree
```

A missing optional peer surfaces at **runtime** (`Cannot find module 'lucide-react'`), not at install
time - npm does not warn about optional peers. The table above is where you look it up.

The barrel (`from 'tinita-react'`) is **exactly the Node-safe set**: 9 hooks + 2 utils, **no
components**. Changed 2026-10-07. Components come from their own subpath only -
`import { Ping } from 'tinita-react/ui/ping'` - which is also how they bring their own CSS.

#### The library's CSS does not touch yours

Verified in Chromium against a real consumer app: **11 surfaces, 0 leaks**. Concretely:

- No rule targets `body`, `html` or `*`. Nothing sets `color-scheme`.
- Every class, custom property and `@keyframes` carries the `tnt-` prefix. Keyframes included: the
  names `accordion-down` / `accordion-up` collide with shadcn, so they were renamed.
- Dark mode **reads** your convention (`.dark` or `[data-theme='dark']`) through `:where()`, so its
  specificity is 0 and you can always override it without `!important`.
- The JSX contains no Tailwind classes. Components render correctly whether or not your app has
  Tailwind.

You do not have to do anything. If you want your CSS to win in every situation regardless, use the
layered build:

```css
@layer tnt, theme, base, components, utilities; /* declare BEFORE the import */
@import 'tinita-react/styles.layer.css';
```

Unlayered CSS always beats layered CSS, so with `.layer.css` any ordinary rule of yours overrides the
components - no `!important` needed. The trade-off is that it overrides even when you did not intend
to. Both builds ship and you choose:

| File                            | When to use it                                           |
| ------------------------------- | -------------------------------------------------------- |
| `tinita-react/styles.css`       | the default                                              |
| `tinita-react/styles.layer.css` | when your CSS is losing, or you want full override power |

The two files have the same content, generated from one source at build time.

---

### tinita-dom (v0.1.0)

**22 subpaths.** Browser-only: these need a document to do their job, so **calling** one on a server
is an error and there is no guard for that - deliberately. `installSmoothScroll` attaches listeners to
`document`, and on the server there is nothing to attach them to.

**Importing** any of them without a DOM is safe, though, and that is enforced: nothing touches
`document` at module load, so a bundler or an SSR pass can walk the package without throwing.

| Folder        | What is in it                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------- |
| `converter/`  | `blobToFile`, `base64ToFile`, `uint8ArrayToFile` - here because `File` is not a global on Node 18 |
| `dimension/`  | `getScrollbarSize` - `[0, 0]` where scrollbars are overlays                                       |
| `file/`       | `downloadBlob`                                                                                    |
| `html/`       | `htmlToJson`, `jsonToHtml`, `elementToJson`, `isBlockLevelHtml`                                   |
| `image/`      | `resizeImage`                                                                                     |
| `storage/`    | `localStorageJson`, `sessionStorageJson`, `cookieJar`, `createJsonStore`                          |
| `style/`      | `setCssVariables`                                                                                 |
| `unit/`       | `toDevicePixels`, `fromDevicePixels` - the part that varies per display                           |
| `validation/` | `isTouchDevice`, `isCoarsePointer`, plus user-agent heuristics in `platform` and `browser`        |
|               | `smooth-scroll`, `wheel-source`                                                                   |

Zero dependencies. Zero peer dependencies. No React required. `tinita` is a **devDependency** only -
`bundle: true` inlines what is used, so the published package pulls nothing at runtime.

```ts
import { installSmoothScroll } from 'tinita-dom/smooth-scroll';

// Call it ONCE, outside React - StrictMode's double-invoked effects would install it twice.
const uninstall = installSmoothScroll();
uninstall(); // remove it when you need to
```

One app-wide `wheel` listener with two distinct behaviours: a detented wheel is eased on exactly the
element the browser would have scrolled anyway; and a vertical wheel over an element that can only
scroll horizontally scrolls it horizontally, which the browser does not do. Input that is already
smooth (a trackpad, Mos, Mac Mouse Fix) is left to the browser - smoothing something already smooth is
what makes a page feel like it lags behind your hand.

It deliberately does not touch: a wheel event that is already `defaultPrevented`, `Ctrl+wheel`, a
wheel event that already has `deltaX`, any subtree carrying `data-no-smooth-scroll`, and anyone with
`prefers-reduced-motion` enabled.

```ts
import { classifyWheelSource } from 'tinita-dom/wheel-source';
```

Details: [`packages/tinita-dom/README.md`](./packages/tinita-dom/README.md).

---

## Printing

**You do not need to measure anything, and you should not convert to pixels.** Write
physical units in CSS and the browser maps them to paper using the printer's
resolution - a number it knows and JavaScript never does.

Measured with Chromium's PDF output on 2026-10-01. `@page { size: 100mm 50mm }`
produced a MediaBox of `282.96 x 142.08 pt`, which is `99.82 x 50.12 mm`, and it was
**identical at `devicePixelRatio` 1, 2 and 3**. The screen plays no part in printing.

```css
@page {
  size: A4; /* or `210mm 297mm`, or `A4 landscape` */
  margin: 10mm;
}

@media print {
  /* Physical units, end to end. No px, no conversion. */
  .label {
    width: 63.5mm;
    height: 38.1mm;
  }

  /* Keep a block off a page boundary. */
  .invoice-row {
    break-inside: avoid;
  }

  /* Backgrounds are dropped by default; ask for them when they carry meaning. */
  .status-badge {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

### The one thing that will break your layout

The browser's print dialog has a scale control - "Fit to page", or a percentage. **If
the user does not print at 100%, every millimetre you specified is multiplied, and no
JavaScript can detect it.** There is no API for the print scale, and no event that
reports it.

So if exact size matters - a label sheet, a form that must line up with a
pre-printed one, anything cut to a template - say so on the page, next to the print
button:

> Print at **100%** scale. Turn off "Fit to page".

This is a limitation of printing from a browser, not of this library. The usual
alternative is to generate a PDF server-side, where the scale is yours to set.

### Page sizes, as physical arithmetic

`PAGE_SIZES` is ISO 216/217 plus five North American sizes, in millimetres, verified
against the standards. `convertLength` is for the arithmetic between physical units -
no DPI appears anywhere in it:

```typescript
import { PAGE_SIZES } from 'tinita/print/pageSizes';
import { DEFAULT_PRINT_MARGINS } from 'tinita/print/defaultPrintMargins';
import { convertLength } from 'tinita/unit/convertLength';

const [pageWidth] = PAGE_SIZES.A4; // 210
const [marginX] = DEFAULT_PRINT_MARGINS; // 10
const contentWidth = pageWidth - 2 * marginX; // 190 mm

Math.floor(contentWidth / 63.5); // 2 label columns fit
convertLength(63.5, 'mm', 'pt'); // 180, if a tool wants points
```

### When a DPI number IS the right answer

Only when you generate a **raster** that will be printed: a canvas exported as PNG, or
an image embedded in a PDF. The resolution then is the one the press asked you for - a
requirement you were given, never a property of the user's screen.

```typescript
import { PRINT_DPI, toPrintPixels } from 'tinita/unit/printPixels';

const [widthMm, heightMm] = PAGE_SIZES.A4;
const canvas = document.createElement('canvas');
canvas.width = Math.ceil(toPrintPixels(widthMm, 'mm', PRINT_DPI.offset)); // 2481
canvas.height = Math.ceil(toPrintPixels(heightMm, 'mm', PRINT_DPI.offset)); // 3508
```

`PRINT_DPI` is `{ draft: 72, photo: 150, offset: 300, lineArt: 600 }`. The result is
deliberately **not** rounded, because the right direction depends on the job: `ceil`
so a page never loses its last pixel row, `round` for a photo, `floor` when tiling.

The inverse answers "will this scan fit":

```typescript
import { fromPrintPixels } from 'tinita/unit/printPixels';

fromPrintPixels(2480, 'mm', 300); // 209.97 - fits A4's 210mm
```

### Why there is no `measureScreenDpi()`

Because it cannot be written. `DPI = sqrt(w² + h²) / diagonal in inches`, and a
browser gives you `w` and `h` - `screen.width * devicePixelRatio` - but never the
diagonal. Measured, each ruled out:

| Attempt                                          | Result                                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `<div style="height:100mm">` then `offsetHeight` | `377.94px` at every `devicePixelRatio`, print media included - CSS **defines** the ratio |
| The whole `screen` API                           | 9 properties, none physical; `screen.width` is CSS px                                    |
| `@media (resolution: Xdpi)`                      | just `devicePixelRatio * 96` - the same information                                      |
| `getScreenDetails()` (Window Management API)     | not implemented here, and its spec has no physical field                                 |
| `userAgentData.getHighEntropyValues()`           | platform, version, model - no dimensions                                                 |

A 24" 1080p monitor and a 27" 4K monitor differ in no number a browser will report
except `devicePixelRatio`, and that is hardware pixels, not inches. The omission is
deliberate: physical screen size is a strong fingerprinting signal.

`tinita-dom/unit/toDevicePixels` covers the part that genuinely does vary per display,
which is what you want for a sharp canvas **on screen** - not for print.

## Validation

Every public function in `tinita` and `tinita-dom` rejects a bad argument by throwing,
and the message names the function you called:

```
createRange: end must be an integer, got 2.5
fileSize: size must not be negative, got -5
toDevicePixels: value must be a finite number, got NaN
```

The function named is always the one **you** called, never an inner helper. That is
deliberate: a message reading `base64ToBytes: ...` when you called `base64ToString`
sends you to the wrong place.

**`TypeError` for a bad argument, `RangeError` for a bounded interval.** `TypeError`
covers the wrong type, `NaN`, `Infinity`, a negative where only non-negative makes
sense - a value contract with no upper bound. `RangeError` is used only where the
contract is an explicit interval; there is exactly one in these packages,
`resizeImage`'s `quality`, which must be within `0..1`.

Nothing is silently coerced or clamped. If a call returns, the arguments were valid.

The primitives behind this are exported, so your own code can use the same vocabulary
and get the same message shape:

```typescript
import { assertFiniteNumber } from 'tinita/asserts/assertFiniteNumber';

export function scaleCanvas(width: unknown) {
  assertFiniteNumber(width, 'scaleCanvas', 'width');

  return width * devicePixelRatio; // `width` is `number` from here on
}
```

They use TypeScript's `asserts value is T`, so one call both validates at runtime and
narrows the type - which matters because `number` in TypeScript already admits `NaN`,
`Infinity` and negatives, and because a `.d.ts` guards nothing at all for a consumer
writing plain JavaScript.

The eight are `assertString`, `assertNonEmptyString`, `assertArray`, `assertObject`,
`assertFiniteNumber`, `assertPositiveFiniteNumber`, `assertInteger` and `assertDpi`.
Each has its own subpath, spelled like the `assertFiniteNumber` import above.

## Root scripts

| Script                    | Purpose                                            |
| ------------------------- | -------------------------------------------------- |
| `build`                   | Build every package                                |
| `dev`                     | Dev mode                                           |
| `lint`                    | Lint everything                                    |
| `test`                    | Run the test suites (vitest)                       |
| `check-types`             | Type check                                         |
| `format` / `format:check` | Prettier write / check                             |
| `gate`                    | format, lint, types, build, test, stories, L1      |
| `gate:full`               | the above plus L2 and L4 (needs chromium, minutes) |
| `check-stories`           | Every published subpath must have a story          |
| `check-doc-links`         | Every import path written in a .md must exist      |
| `storybook`               | Run Storybook                                      |
| `build-storybook`         | Build the static Storybook                         |
| `deploy:storybook`        | Deploy Storybook                                   |
| `publish:tinita`          | Publish `tinita`                                   |
| `publish:tinita-react`    | Publish `tinita-react`                             |
| `publish:tinita-dom`      | Publish `tinita-dom`                               |
| `publish:all`             | Publish all three                                  |
| `publish:dry-run`         | Dry run                                            |

`scripts/publish.mjs` discovers packages by reading `packages/`, and it stops at `npm whoami`.
Publishing is a manual, authenticated step.

There is **no `generate:exports`**. `exports`, `typesVersions` and the tsup entries are maintained by
hand - see [CLAUDE.md](./CLAUDE.md).

---

## Layout

```
tinita/
  ├── packages/tinita          # 52 subpaths, runs everywhere, zero deps
  ├── packages/tinita-react    # 1 hook + 4 components + CSS
  ├── packages/tinita-dom      # 22 subpaths, browser-only
  ├── apps/storybook           # Storybook 10
  ├── compatibility/           # consumer test lab (outside the pnpm workspace)
  ├── config/                  # ESLint, TypeScript, UI configs
  ├── scripts/                 # gate.mjs, publish.mjs, deploy-storybook.mjs
  └── docs/                    # documentation (see docs/README.md)
```

`compatibility/` installs the packed tarballs into throwaway projects and exercises them the way a
user would - import resolution, optional peers, SSR, CSS leaks, `next build`. It is deliberately
outside the pnpm workspace so nothing resolves back to the source.

---

## Stack

- **Workspace:** pnpm 9 + Turborepo
- **Node:** >=18
- **Browsers (CSS floor):** Chrome 111, Safari 16.2, Firefox 113 - see below
- **Build:** tsup and Vite (JS) + PostCSS (CSS)
- **Tests:** Vitest - `tinita` 35, `tinita-react` 49, `tinita-dom` 17
- **Release:** manual, via `scripts/publish.mjs`

### The CSS floor, and where it comes from

`tinita-react`'s stylesheets use two modern colour functions, so the browser floor is
set by them rather than by anything in the JavaScript:

| Function      | Used for                                                      | Chrome | Safari | Firefox |
| ------------- | ------------------------------------------------------------- | ------ | ------ | ------- |
| `oklch()`     | `--tnt-ping`, `--tnt-ping-dot`                                | 111    | 15.4   | 113     |
| `color-mix()` | `--tnt-tree-selected-bg`, `--tnt-floating-window-border-idle` | 111    | 16.2   | 113     |

`oklch()` has been in the published CSS since before this was written down; measured
2026-10-06, three declarations use it. `color-mix()` was added deliberately on
2026-10-06 so those two tokens derive from `--tnt-ring` and `--tnt-border` instead of
freezing a hand-computed value - override the palette token and the tint follows.

`rgb(from ...)` relative colours would have done the same job and kept the computed
value serialising as `rgba()`, but its Firefox floor is 128 (July 2024) against 113
for what the package already required. That is roughly fifteen months of Firefox for
a cosmetic difference, so `color-mix()` won.

One observable consequence: a `color-mix()` result serialises as
`color(srgb 0.145098 0.388235 0.921569 / 0.12)`, not `rgba(37, 99, 235, 0.12)`. The
colour is the same to within float rounding - measured `99.0` coming back as
`98.9999`, four significant figures below one 8-bit step - but code that compares
`getComputedStyle` output as a **string** will see a different value. Compare numbers.

`tinita` and `tinita-dom` ship no CSS and have no browser floor of their own beyond
the DOM APIs each function names.

---

## Docs

See [`docs/README.md`](./docs/README.md) for the project overview and PDR, the codebase summary, code
standards, system architecture and design guidelines. Those documents are written in Vietnamese.

---

## Known issues

1. **The versions currently on npm are broken.** `tinita@0.0.1` has 6 of 18 manifest paths pointing at
   files that are not in the tarball, and `tinita-react@0.0.2-alpha.1` has 7 of 25. Both predate the
   build fixes in v0.1.0. They have not been deprecated yet. Install from source until v0.1.0 is
   published.
2. ~~**The `tinita-react` barrel pulls in optional peers.**~~ Fixed 2026-10-07: the barrel no longer
   re-exports components, so the root entry needs neither `@base-ui/react` nor `lucide-react`, and
   it loads under plain `node` again. Components are subpath-only.
3. **Two versions of `tinita-react` in one dependency tree is not supported**, the same way two
   copies of React are not. Component CSS uses stable class names (`tnt-ping-root`, not a hash), so
   two versions declare the same selectors and the winner is decided by **bundle order, not by
   version**.

   Measured 2026-10-06 in a real vite app with `0.1.1` at the top level and `0.1.0` nested under a
   wrapper library, the nested copy marked so it could be told apart:

   ```
   .tnt-ping-root defined x3, in bundle order:
     offset  5717  {align-items:center;display:inline-flex}   0.1.1 top-level
     offset 12316  {align-items:center;display:inline-flex}   0.1.0 nested
     offset 13199  {display:block;outline:3px solid magenta}  0.1.0 nested, the marker
   ```

   Equal specificity, so the last one wins: the **older** copy styled the newer copy's component.
   When the two copies' CSS is identical the bundler collapses it to one (no size penalty); when it
   differs, both are kept and only the delta is added (77 bytes here, exactly the two marked lines).
   Nothing is silently substituted - but the cascade is not yours to predict.

   Detect it with `npm ls tinita-react`. Fix it with `overrides` (npm/pnpm) or `resolutions` (yarn)
   pinning a single version. A single version using many components does **not** duplicate anything:
   measured, shared CSS and tokens each land exactly once.

   There is deliberately no runtime warning, version token or versioned class name for this. See
   `docs/system-architecture.md` for why.

---

## Contributing

Read [ARCHITECTURE.md](./ARCHITECTURE.md) and [CONTRIBUTING.md](./CONTRIBUTING.md) first. The
principles: one file per function, subpath exports, strict typing, and no global CSS.
