# Tinita

A monorepo of framework-agnostic utilities, React hooks and UI components, with Storybook.

**Packages:** `tinita` (v0.1.0, 5 utilities) · `tinita-react` (v0.1.0, 1 hook + 4 components) · `tinita-dom` (v0.1.0, DOM utilities, browser-only)

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

Five framework-agnostic utilities:

```typescript
import { fileSize } from 'tinita/file/fileSize';
import { getFileNameParts } from 'tinita/file/getFileNameParts';
import { truncateFileName } from 'tinita/file/truncateFileName';
import { truncateFileNameParts } from 'tinita/file/truncateFileNameParts';
import { generateUUID } from 'tinita/uuid/generateUUID';
```

Zero dependencies, zero peer dependencies. The barrel import (`from 'tinita'`) works too.

### tinita-react (v0.1.0)

One hook and four UI components, CSS included. **Import specific subpaths rather than the barrel** -
see the note under the peer table for why.

```typescript
// Hook
import { useToggle } from 'tinita-react/hooks/useToggle';

// Components
import { Tree } from 'tinita-react/ui/tree';
import { FileTree } from 'tinita-react/ui/file-tree';
import { Ping } from 'tinita-react/ui/ping';
import { CarouselTicker } from 'tinita-react/ui/carousel-ticker';

// Utility
import { autoInjectStyles } from 'tinita-react/utils/autoInjectStyles';

// CSS
import 'tinita-react/styles.css';
```

#### Install per component

`tinita-react` has **no `dependencies`**. Any library that only part of the package needs is an
**optional peer**, so you install only what the components you import actually use.

| Import                                | Also install                      |
| ------------------------------------- | --------------------------------- |
| `tinita-react/ui/ping`                | nothing                           |
| `tinita-react/ui/carousel-ticker`     | nothing                           |
| `tinita-react/hooks/*`                | nothing                           |
| `tinita-react/utils/autoInjectStyles` | nothing                           |
| `tinita-react/ui/tree`                | `@base-ui/react`                  |
| `tinita-react/ui/file-tree`           | `@base-ui/react` + `lucide-react` |

`react >=18` is a required peer for every entry point.

```bash
npm install tinita-react                                # Ping, CarouselTicker, hooks
npm install tinita-react @base-ui/react                 # adds Tree
npm install tinita-react @base-ui/react lucide-react    # adds FileTree
```

A missing optional peer surfaces at **runtime** (`Cannot find module 'lucide-react'`), not at install
time - npm does not warn about optional peers. The table above is where you look it up.

The barrel (`from 'tinita-react'`) re-exports `./ui/file-tree`, so importing `Ping` through it pulls
in `@base-ui/react` and `lucide-react` even though `Ping` needs neither. That is the technical reason
to prefer specific subpaths.

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

Framework-agnostic DOM utilities. **Browser-only** - it touches `document`, `window.matchMedia` and
`requestAnimationFrame`. There is no SSR guard, and that is deliberate: `installSmoothScroll` attaches
listeners to `document`, and on the server there is nothing to attach them to.

Zero dependencies. Zero peer dependencies. No React required.

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
  ├── packages/tinita          # 5 utilities, zero deps
  ├── packages/tinita-react    # 1 hook + 4 components + CSS
  ├── packages/tinita-dom      # DOM utilities, browser-only
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
- **Build:** tsup and Vite (JS) + PostCSS (CSS)
- **Tests:** Vitest - `tinita` 35, `tinita-react` 49, `tinita-dom` 17
- **Release:** manual, via `scripts/publish.mjs`

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
2. **The `tinita-react` barrel pulls in optional peers.** `src/index.ts` re-exports `./ui/file-tree`,
   so `import { Ping } from 'tinita-react'` requires `@base-ui/react` and `lucide-react`. Use specific
   subpaths.

---

## Contributing

Read [ARCHITECTURE.md](./ARCHITECTURE.md) and [CONTRIBUTING.md](./CONTRIBUTING.md) first. The
principles: one file per function, subpath exports, strict typing, and no global CSS.
