# Changelog

## 0.1.0 - unreleased

First release of all three packages as a set. `tinita-dom` is new to npm;
`tinita@0.0.1` and `tinita-react@0.0.2` are superseded and will be deprecated.

### Breaking, relative to what is published

The `0.0.x` releases were broken on npm: measured by lab case `07-registry-vs-local`,
`tinita@0.0.1` has 6 of 18 export paths pointing at files absent from its own tarball,
and `tinita-react@0.0.2-alpha.1` has 7 of 25. Anything that worked did so by accident
of the bundler in front of it.

- **`generateUUID` is now `generateUuid`.** Acronyms are written as ordinary words
  across all three packages - `Url`, `Html`, `Json`, `Mime`, `Uuid`, `Css`. The
  all-caps spelling produced unreadable names whenever an acronym led: `JSONToHTML`,
  `MIMEToFileExtension`, `CSSVariable`. One convention, no exceptions, because leaving
  one is how the inconsistency comes back.
- **`export default` is gone from every package.** Named exports only. `require()` on
  a default-only module returns `{ default: fn }` rather than the function, and the
  worst case was silent: `html.extend(require('tinita/html/plugin/entities'))` passed
  that object into `extend()` and did nothing.

### Added

- `tinita`: 60 public subpaths, up from 5. New groups `array/`, `asserts/`, `date/`,
  `html/`, `mime/`, `object/`, `print/`, `string/`, `unit/`, `validation/`, and 10 more
  converters.
- `tinita-dom`: 22 subpaths, up from 2, and `engines` is now declared (`>=18.0.0`); it
  had been undefined while the other two packages declared it.
- `tinita-dom/wheel-source`: `WheelSample` gained an optional `deltaMode`, and
  `WHEEL_DELTA_MODE_LINE` / `WHEEL_DELTA_MODE_PAGE` are exported alongside the six
  existing constants. Line and page mode are a certain detent - no trackpad reports
  either - so `classifyWheelSource` checks it before any timing inference.
  `smooth-scroll` read `deltaMode` for unit conversion and then dropped it one line
  before sampling, discarding the strongest signal available.
- `classifyWheelSource` now returns `null` for a sparse stream of small deltas rather
  than guessing. A per-frame smoother throttled by a background tab and a fine-encoder
  wheel nudged one notch at a time produce the same shape; the old code called both
  `stepped`, while `provisionalWheelSource` in the same module leaned the opposite way.
  `null` is already the documented answer for "not enough evidence", and it preserves a
  `stepped` verdict that a real detent burst settled instead of overwriting it.
- `tinita-react`: `useDoubleTap`, `usePagination`, `useRefreshComponent`,
  `useRequiredContext`, `useWindowSize`, `useIsomorphicLayoutEffect`, `jsxJoin`.
- `tinita-react/ui/floating-window`: a draggable, resizable window portalled into
  `document.body`, with a collapsed edge-snapping bubble. Controlled - `open`, `mode`,
  `geometry` and the bubble position are props - so persistence is the consumer's
  decision. Minimize animates a `transform` instead of unmounting, so an `<iframe>`
  child keeps its state and does not reload. Motion is CSS, which is what lets
  `prefers-reduced-motion` switch it off.
  Unlike the other three components, the library's own `'use client'` is **not enough**
  for a React Server Component: `onOpenChange` is a function prop, and
  `next build` reports `Event handlers cannot be passed to Client Component props`.
  The consumer wraps it. Two L2 cases lock both halves.
- `react-dom >=18` is now a **required** peer, for `createPortal`. It was already in
  vite's `external` list without being declared, next to a comment saying that list
  must match `peerDependencies` - so this closes an existing mismatch rather than
  adding a dependency.
- `tinita-react/hooks/useDragSnap` and `tinita-react/hooks/useWindowDrag`: the two
  hooks behind `FloatingWindow`, as public subpaths. Both are controlled - they hold
  the live gesture and nothing else, so the caller owns the position and decides
  whether it is remembered. `useDragSnap` reads no `window`; the viewport is an
  argument, which is what lets it render on a server. Each re-exports the types its own
  signature uses, so `geometry` needs no subpath of its own.
- `FloatingWindow` takes `keyBindings`, and **binds nothing by default**. A window is
  not a modal, so a hardcoded `Escape` would discard whatever the reader was doing in
  it. The syntax is `tinita/converter/parseKeyCombination`'s, so `cmd`, `⌘`, `option`
  and `win` all work, and an array binds several combinations to one action. A bare
  printable key is ignored while the focus is in a text field - binding `m` to minimise
  would otherwise fire on every `m` typed into an input - while modified and named keys
  still fire there.
- `FloatingWindow` swaps Control for Command, and the reverse, to match the platform -
  so `minimize: 'Ctrl+M'` is one binding that fires on Control under Windows and on
  Command on a Mac. The **listener** is mapped, not only the label, which is what keeps
  the label honest. Name both yourself (`['Ctrl+M', 'Cmd+M']`) and nothing is touched;
  combinations with neither modifier are never remapped. It is the `Mod` convention
  without the keyword. The surprising half: a lone `'Ctrl+M'` _becomes_ Command on a
  Mac, so Control+M stops firing there.
- `FloatingWindow`'s controls advertise their shortcut: hovering minimise shows
  `Minimize (Ctrl + M)`, or `Minimize (⌘M)` on an Apple keyboard - concatenated, with
  glyphs for the named keys, which is Apple's own convention (`⌥⌘⎋`). The combination
  shown is **picked from the bindings by platform**, not translated into them - bind
  only `'Ctrl+M'` and a Mac shows `⌃ + M`, because Control is still the key that fires
  there. The action name stays in `aria-label` and every bound combination goes in
  `aria-keyshortcuts`. One parse feeds both the listener and the label, so a control
  cannot advertise a key it does not answer.
- React 18 support is now measured, not just claimed. The lab builds and mounts the
  components in a real Chromium on **both 18 and 19** and fails on a hydration error;
  `FloatingWindow` was added to that case, so the component with the newest code has
  coverage on the oldest supported React. 18 is a hard floor either way, because
  `Tree` and `useWindowSize` are built on `useSyncExternalStore`.
- `tinita/html` and `tinita/mime`: a small default table plus an opt-in plugin applied
  with `.extend()`, after dayjs. The full MIME table is 71KB of output and
  `bundle: true` would have inlined it into every call site.
- `tinita/asserts/*`: eight assertion primitives, each a public subpath -
  `assertString`, `assertArray`, `assertFiniteNumber`, `assertObject`,
  `assertNonEmptyString`, `assertInteger`, `assertPositiveFiniteNumber`, and the
  domain-named `assertDpi`. All use TypeScript's `asserts value is T`, so one call both
  validates at runtime and narrows at compile time; all take the calling API's name, so
  a message reads `createRange: end must be an integer, got 2.5` rather than leaving
  the caller to guess which argument of which function was rejected. `.d.ts` guards
  nothing for a JavaScript consumer, and `number` in TypeScript already admits `NaN`,
  `Infinity` and negatives - a signature cannot express `finite && > 0`.
  The reason they exist as a shared vocabulary rather than per-file checks: an
  `assertString` with the correct signature was already in `html/html.ts`, solving a
  condition present in 14 files, and it was used in 1 - while a second helper,
  `assertDpi`, was written a day later in `unit/printPixels.ts` without the `asserts`
  signature. Two shapes, one codebase, one day apart.
- Tests: 546, up from 156.

### Fixed - defects that destroyed data or could not work at all

Each of these was measured, and the number that found it is in the function's JSDoc.

- `cookieStorageAction.clear()` wrote `expire=` where the attribute is `expires=`, so
  it deleted **nothing** while appearing to succeed. `cookieJar` replaces it, and has
  no `clear()` at all - it cannot be done honestly from JavaScript.
- `cookieStorageAction.set()` did not percent-encode, so a value containing `;`
  corrupted the whole cookie jar rather than just its own entry, and set no `path`, so
  a cookie written on `/a/b` was invisible on `/`.
- `localStorageAction.get()` called `JSON.parse` with no `try`, so one foreign value on
  a shared key made it throw - in the function whose own `defaultValue` parameter
  promised a fallback.
- `isBlockTag` assigned untrusted input to `innerHTML`, which runs
  `<img src=x onerror=...>`. Proven in Chromium: with `innerHTML` the payload executes,
  with `DOMParser` it does not.
- `stringToEventCode` could not parse `Ctrl+Shift+A` - it reassigned all four modifier
  flags on every loop iteration, so only the last survived. `parseKeyCombination`
  replaces it.
- `acceptTypeToRegex` threw `SyntaxError` on `accept="image/*"`, the most common value
  there is, and its pattern had no dot anchor so it accepted `notapng`. Now
  `mime.acceptToRegExp`.
- `isVietnamese` was not deterministic: its RegExp carried `g`, so `.test()` advanced
  `lastIndex` and six calls with the same input returned
  `true false true false true false`. Now `hasVietnameseDiacritics`, without the flag.
- `sortAlphaText` sorted its argument **in place** while also returning it, and used
  bare `localeCompare`, so Vietnamese sorted wrong by default and differently per
  machine.
- `usePagination` compared a page number against an item count in two places, and
  synced state from props with four `useEffect`s - two of which both wrote the page,
  one with a bounds check and one without.
- `useWindowSize` read `window.innerWidth` inside a `useState` initialiser, under a
  comment claiming it had been written to avoid exactly that. On a server it threw.
- `LengthConverter` measured a DPI that does not exist. CSS fixes `1in = 96px` by
  specification, so its probe returned the same 96.012 at every device scale factor -
  it was reading `offsetHeight` rounding. `convertLength` is now pure, and
  `toDevicePixels` covers the part that really does vary per display.
- `useDoubleTap` never cleared its timer, so a component unmounted inside the threshold
  still ran `onSingleTap`.
- `sortDate` wrote `left - right * direction`; `*` binds tighter, so `desc` computed
  `left + right` - not a reversal, not an ordering.
- `resizeImage` documented `quality` as "0 to 1" and validated nothing. The HTML spec
  has `toDataURL` **ignore** a quality outside that interval and silently use its
  default, so `quality: 1.5` returned a default-quality image and reported nothing.
  Now `RangeError` - the only one in the repo, because `0..1` is an explicitly bounded
  interval. Lossy types only: refusing it for `image/png` would reject a valid call.
- `cookieJar.maxAge` validated nothing, and `Math.floor(NaN)` is `NaN`, so `Max-Age=NaN`
  is unparseable and the browser discards the **whole** cookie. `set` returns `void`, so
  a session or CSRF cookie simply never got written. `TypeError`, not `RangeError`:
  there is no upper bound to exceed, and `0` is valid and means expire now.
- `prependUnique` read `if (!Array.isArray(list)) return list;` - silently returning a
  non-array while `uniqueArray`, `sortAlphaText` and `sortDates` all threw. It was the
  outlier, and no test locked the behaviour.
- `fileSize` returned the string `"NaN undefined"` for `-5`, `NaN`, `Infinity`, `'x'`
  and `null`: `Math.log` of a negative is `NaN` and `sizes[NaN]` is `undefined`. That
  string looks like a value and renders straight into a UI. A `base` outside the
  documented pair did the same - `fileSize(1024, 2)` returned `"1 undefined"`, because
  `log2(1024)` is 10 and the unit list has nine entries.
- `provisionalWheelSource` answered `'smoothed'` for a non-number - a confident wrong
  verdict, because `Math.abs('x')` is `NaN` and `NaN` fails both comparisons.
- `objectToMap` returned an empty `Map` for a non-object and let `Object.keys` throw
  its own `TypeError: Cannot convert undefined or null to object` for `null`, naming
  neither the function nor the parameter.
- Six public functions threw a message naming a function the caller never called, by
  letting an inner helper do the throwing: `base64ToString` and `base64ToBlob` named
  `base64ToBytes`, `toDevicePixels` named `convertLength`, `truncateFileName` and
  `truncateFileNameParts` named `getFileNameParts`, and `provisionalWheelSource` named
  `decisiveWheelSource`. Each now asserts under its own name.

### Renamed, because the old name said the wrong thing

`isNumber` to `isNumericString` (the pattern is `/^\d+$/`, so `'1.5'` was `false`).
`isAlphabet` to `isAsciiLetters` (`[a-zA-Z]`, so `'Đèn'` was `false` - a bad claim in a
package shipping Vietnamese helpers). `isVietnamese` to `hasVietnameseDiacritics` (no
character test can answer "is this Vietnamese"). `removeEmptySpace` to
`collapseWhitespace` (it collapses, it does not remove). `blobToURL` to
`createBlobObjectUrl` (it allocates something the caller must revoke). `Pick`/`Omit` to
`pick`/`omit` (they collided with TypeScript's own utility types).
`stringToEventCode` to `parseKeyCombination` (it never produced an `event.code`).
`CreateContextHook` to `useRequiredContext` (it calls `useContext`, so it is a hook).

### Infrastructure

- `pnpm lint` is a gate for the first time. `eslint-plugin-only-warn` downgrades every
  rule to a warning, and the three package scripts had no `--max-warnings` - measured
  149 warnings at exit 0, so any rule added to them was inert.
- `pnpm gate` gained `doc-links`, which fails when a markdown file names an import path
  that is not in any package's `exports`. `CLAUDE.md` had stated
  <!-- doc-links-ignore -->
  `tinita-react/hooks` and `tinita-react/ui` were required import paths; neither has
  ever existed. The guard found nine such errors across the docs on its first run,
  including one introduced minutes earlier by a bulk rename.
- `pnpm gate` gained `assert-reuse`, which fails an inline condition that duplicates
  one of the eight primitives and names the one to use. It matches a pattern, not an
  intent: its first run reported 43 sites of which 4 were false positives - two
  predicates, one piece of function logic, one clamp contract - which is why its
  exemption marker requires a written reason and a bare marker still fails. Three
  defects in the guard itself were each found by using it: the marker detached when the
  reason ran to three lines, it did not reach a condition sitting past a line of code,
  and the summary printed the exemption count where the total belonged.
- Entry globs now cover every extension in use. A `*.ts` glob silently excluded files
  three times: `src/*.ts` in `tinita-dom` missed every subdirectory, and in
  `tinita-react` both the tsup and the vite scanners missed `.tsx`, so `jsxJoin` had
  type declarations with no JavaScript behind them.
