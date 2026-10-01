# ARCHITECTURE.md

This document defines the core architectural principles, edge cases, and compliance rules for the **tinita** monorepo. These guidelines ensure consistency, tree-shakeability, and maintainability across all packages.

---

## 1. Dependency & Versioning

### 1.1 Core Package Independence

**Rule**: the published packages MUST NOT have runtime dependencies on external
micro-packages.

❌ **Bad Example** (DO NOT DO THIS):
```typescript
// Inside tinita
import { isNumericString } from 'some-is-numeric-string';
```

If such a micro-package is ever published, it must be:
- An independent package, NOT the sole source for `isNumericString` in `tinita`
- `tinita` must keep its own internal implementation

**Where this rule is actually tested**: `tinita` and `tinita-dom` declare `{}` as
`dependencies`, and `tinita-react` declares `react` as a required peer with everything
else optional. L1 case `04a-consumer-is-clean` installs a package into an isolated
project and asserts what landed in `node_modules`.

### 1.2 Avoiding Version Drift

**Problem**: Prevent scenarios where `positiveNumber@1.0.0` uses `isNumber@1.0.0` but the user installs `isNumber@1.1.0`, causing behavior conflicts.

**Solutions**:
1. **Internalize or bundle** core implementations into their parent package
2. Do NOT let `tinita` behavior depend on versions users install separately
3. Similar to `lodash` vs `lodash.isnumber` - they are independent at runtime

This is also why `tinita-dom` and `tinita-react` list `tinita` as a **devDependency**
rather than a dependency: `bundle: true` inlines what they use, so a consumer cannot
end up with one version of `tinita` behind the package and a different one in front of
it. Verified on the build output - `tinita-dom/dist/unit/toDevicePixels.mjs` carries the
unit table inline and imports nothing.

### 1.3 Runtime Dependencies (When Required)

If runtime dependencies are absolutely necessary (rare in tinita):

1. Use `peerDependencies` + `dependencies` carefully
2. Follow **strict semver**:
   - Any breaking change MUST increment **major** version
   - `^1.0.0` means ALL `1.x.x` versions are backward-compatible
3. Document the dependency relationship clearly

### 1.4 Caret (^) Usage Discipline

For critical dependencies in foundation packages:

❌ Avoid:
```json
"dependencies": {
  "critical-dep": "^1.2.3"
}
```

✅ Prefer:
```json
"dependencies": {
  "critical-dep": "1.2.3"
}
```

**Rationale**: Reduces risk from hoisting and version drift causing behavior changes.

---

## 2. Package Architecture & Boundaries

### 2.1 Monorepo Structure

tinita is a monorepo with three published packages. Names are **unscoped**:

- **`tinita`** - runs everywhere, Node and browser. 51 public subpaths.
- **`tinita-dom`** - browser minimum: needs a document to do its job. 22 subpaths.
- **`tinita-react`** - React minimum, and must survive SSR. 13 subpaths plus 4 CSS entries.

Plus `config/` (shared ESLint, TypeScript and UI config, private) and `apps/storybook`
(private).

> Corrected 2026-10-01. This section previously listed `tinita`, `tinita-react`,
> `@tinita/vue`, `@tinita/node` and `@tinita/config`. **None of those packages has ever
> existed**, there is no Vue or Node package, and the real names carry no scope. A reader
> following the old text would have installed nothing that resolves. Kept as a note
> because the same class of error - documentation describing an API that is not there -
<!-- doc-links-ignore -->
> also put `tinita-react/hooks` in CLAUDE.md as a required import path, and is now
> guarded for subpaths by `scripts/check-doc-links.mjs`.

### 2.2 Separation by Runtime, Not by Framework

The boundary is **what a function needs in order to run**, not which framework a user
happens to have. "Shared utilities" cannot be checked by a test; "runs in plain Node"
can, and the lab measures it.

**Strict Rules**:
1. `tinita` must import cleanly AND run with no DOM. Guarded by L1 (plain Node) and the
   L2 SSR cases, which import every `tinita` specifier derived from `contract.json`.
2. `tinita-dom` may use `document` and `window` **when called**, never at import time -
   the module must still load during SSR. Guarded by the L2 SSR skip plus L4 in Chromium.
3. `tinita-react` declares `react` as a required peer and everything else as an optional
   peer. It may depend on `tinita` at build time, where `bundle: true` inlines the code so
   the published package takes no runtime dependency.
4. No framework code in `tinita` or `tinita-dom`.

❌ **Bad**: React code in core package
```typescript
// tinita/src/useWindowSize.ts
import { useState, useEffect } from 'react'; // WRONG!
```

✅ **Good**: Framework-specific code in appropriate package
```typescript
// tinita-react/src/useWindowSize.ts
import { useState, useEffect } from 'react'; // CORRECT
```

### 2.3 Framework Dependencies

React and Vue MUST be `peerDependencies`, never bundled:

```json
// tinita-react/package.json
{
  "peerDependencies": {
    "react": ">=18.0.0"
  }
}
```

**tsup configuration must externalize frameworks**:
```typescript
// tinita-react/tsup.config.ts
export default defineConfig({
  external: ['react'],
  // ...
});
```

**Rationale**: Never ship React/Vue inside the bundle. Users provide their own framework version.

---

## 3. Tree-Shaking & "Moment-Syndrome" Avoidance

### 3.1 The Problem

**Moment-syndrome**: Users import one small utility but get the entire library bundled.

```typescript
// User only wants isPositive
import { isPositive } from 'tinita';

// BAD: If tinita bundles everything together,
// user gets ALL utilities even if they only use one
```

### 3.2 The Solution: One File = One Function

**Mandatory Structure**:
- `src/number/isNumber.ts` - ONE function
- `src/number/isPositive.ts` - ONE function
- `src/string/isEmpty.ts` - ONE function

**Benefits**:
- Modern bundlers can tree-shake unused modules
- Users only ship what they use

### 3.3 Per-File Builds (No Bundling)

**tsup configuration for utility packages**:

```typescript
// tinita/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  // Real configs auto-discover entries with a glob; see packages/tinita/tsup.config.ts.
  // Note the glob must cover every extension in use - a `*.ts` glob silently excluded
  // `.tsx` files three separate times in this repo.
  entry: [
    'src/index.ts',
    'src/validation/isNumericString.ts',
    'src/validation/isEmail.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  // `true`, NOT false. With `bundle: false` esbuild leaves extensionless relative
  // specifiers in the `.mjs` output and Node ESM rejects them: ERR_MODULE_NOT_FOUND on
  // every internal import. Lab bug B2. Each entry is still its own output file, so
  // subpath tree-shaking is unaffected.
  bundle: true,
  splitting: false,
  clean: true,
  // Without this tsup emits `.js` and every `exports.require` pointing at `.cjs`
  // breaks. Lab bug B1.
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
  outDir: 'dist'
});
```

**Output structure**:
```
dist/
  index.mjs
  index.cjs
  index.d.ts
  number/
    isNumber.mjs
    isNumber.cjs
    isNumber.d.ts
    isPositive.mjs
    isPositive.cjs
    isPositive.d.ts
```

### 3.4 Subpath Exports (Mandatory)

Every utility MUST have a subpath export:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./number/isNumber": {
      "import": "./dist/number/isNumber.mjs",
      "require": "./dist/number/isNumber.cjs",
      "types": "./dist/number/isNumber.d.ts"
    },
    "./number/isPositive": {
      "import": "./dist/number/isPositive.mjs",
      "require": "./dist/number/isPositive.cjs",
      "types": "./dist/number/isPositive.d.ts"
    }
  }
}
```

### 3.5 Recommended Import Patterns

**Allow barrel imports**:
```typescript
import { isPositive } from 'tinita';
```

**But RECOMMEND subpath imports in documentation**:
```typescript
import { isEmail } from 'tinita/validation/isEmail';
```

**Rationale**: Subpath imports guarantee only the specific module is loaded, regardless of bundler tree-shaking capabilities.

---

## 4. Package Relationships (Lodash Pattern)

### 4.1 Large Package vs Micro-Packages

If you create micro-packages in the future:
- `some-is-numeric-string`
- `some-is-positive`

**Rules**:
1. These micro-packages MUST NOT be runtime dependencies of `tinita`
2. `tinita` has its own implementation in `src/number/isNumber.ts`
3. Micro-packages are compiled separately

### 4.2 User Choice

Users can choose:

```typescript
// Option 1: From main package
import { isNumericString } from 'tinita/validation/isNumericString';

// Option 2: From micro-package
import { isNumericString } from 'some-is-numeric-string';
```

**Critical**: These two imports are INDEPENDENT. The version of `some-is-numeric-string` MUST NOT affect `tinita` behavior.

### 4.3 Source Sharing (Monorepo Internal)

Within the monorepo, you CAN share source code via:
- TypeScript path aliases
- Workspace dependencies

But at **build time**, each package must be self-contained.

---

## 5. Build, Test, Lint: Consistency & Automation

### 5.1 Required Scripts

Every package MUST have:

```json
{
  "scripts": {
    "build": "tsup",
    "lint": "eslint src --ext .ts,.tsx",
    "test": "vitest",
    "prepublishOnly": "pnpm run build"
  }
}
```

### 5.2 Turborepo Pipeline

**Dependency graph**:
```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    }
  }
}
```

**Rationale**: `build` respects package dependencies. Tests run after builds complete.

### 5.3 Testing Framework

**Vitest** for entire monorepo:

**Test structure**:
```
packages/<package>/
  tests/
    *.test.ts
    *.test.tsx
```

**Root vitest.config.ts** for shared configuration.

---

## 6. Edge Cases & Gotchas

### 6.1 Adding New Utilities - Checklist

When adding a new utility/hook/composable:

- [ ] Create file in `src/...` (one file = one function)
- [ ] Add to tsup `entry` array
- [ ] Add subpath export to `package.json`
- [ ] Write tests in `tests/`
- [ ] Update package README with usage example
- [ ] Verify build output in `dist/`
- [ ] Test import: `import { thing } from 'tinita/<folder>/<thing>'` - named, never default

**Common mistake**: Forgetting to add to `entry` or `exports` → import fails

### 6.2 Default Export vs Named Export

**Decision required**: Choose ONE pattern and be consistent.

**Option A - Default Export**:
```typescript
// isNumber.ts
export default function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

// Usage
import { isNumericString } from 'tinita/validation/isNumericString';
```

**Option B - Named Export**:
```typescript
// isNumber.ts
export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

// Usage
import { isNumericString } from 'tinita/validation/isNumericString';
```

**Current tinita standard**: named exports **everywhere**, in all three packages.

Corrected 2026-10-01: this previously said "default exports in framework packages
(hooks/composables)". `export default` is now banned in `packages/*/src/**` by
`no-restricted-syntax` in `config/eslint-config/base.js`. The measured reason is in
`docs/code-standards.md`: with `bundle: true` plus `outExtension`, `require()` on a
default-only module returns `{ default: fn }` rather than the function - the same
interop shape bug B1 already had to fix once - and the worst case was a plugin, where
`html.extend(require('tinita/html/plugin/entities'))` passed `{ default: fn }` into
`extend()` and failed silently.

### 6.3 React/Vue Version Mismatch

**Issue**: User has React 17, but `tinita-react` requires React 18+

**Solution**:
- `peerDependencies` specifies minimum version
- npm/pnpm will warn the user
- Document required versions clearly in README

### 6.4 Node vs Browser Environment

**Rules**:
1. `tinita` utilities must be environment-agnostic: no DOM, no Node-only APIs. The test
   is "does this mean anything without a document" - `stringToBase64` on a server does,
   `getScrollbarSize` does not.
2. If a utility needs a document, put it in `tinita-dom` - and it must still **import**
   cleanly without one, so any `document` access happens when called, never at module
   load. There is no Node-only package: nothing in this repo needs `fs` or `path`.
   - Document browser compatibility clearly
   - Use conditional exports if needed:
     ```json
     {
       "exports": {
         "./node": {
           "node": "./dist/node-only.mjs",
           "default": "./dist/node-only-fallback.mjs"
         }
       }
     }
     ```

### 6.5 Internal Dependencies

When one utility needs another **within the same package**:

```typescript
// tinita/src/number/isPositive.ts
import { isNumber } from './isNumber'; // ✅ CORRECT - relative import

export function isPositive(value: unknown): value is number {
  return isNumber(value) && value > 0;
}
```

**Do NOT**:
```typescript
// ❌ WRONG - circular package dependency
import { isNumericString } from 'tinita/validation/isNumericString';
```

### 6.6 Cross-Package Dependencies (Within Monorepo)

If `tinita-react` needs a utility from `tinita`:

```typescript
// packages/tinita-react/src/ui/file-tree/FileTree.tsx - a real example
import { getFileNameParts } from 'tinita/file/getFileNameParts'; // ✅ OK

// package.json declares it as a devDependency, NOT a dependency:
{
  "devDependencies": {
    "tinita": "workspace:*"
  }
}
```

**Rationale**: Framework packages MAY depend on core, but core MUST NOT depend on framework packages.

---

## 7. Core Compliance Principles

### 7.1 Tree-Shaking is Not Optional

Tree-shaking is a **design requirement**, not a nice-to-have:

- One file = one function/hook/composable
- One build output per entry, so a subpath import pulls one file

Corrected 2026-10-01: this previously said `bundle: false`, which contradicts build
invariant 1 in `CLAUDE.md`. `bundle: true` is **required**: with `bundle: false`
esbuild leaves relative specifiers without an extension in the `.mjs` output and Node
ESM demands one, so every internal import failed with `ERR_MODULE_NOT_FOUND` - lab bug
B2. Tree-shaking is unaffected because each entry is still its own file.
- Explicit subpath exports
- No side effects in module initialization

### 7.2 Framework Isolation

- React only in `tinita-react`
- `tinita` and `tinita-dom` are framework-agnostic
- There is no Vue package. If one is ever added it follows the same rule.
- Frameworks are `peerDependencies`, never bundled

### 7.3 TypeScript-First

- All code written in TypeScript
- Type definitions shipped with every package
- Strict mode enabled
- No `any` types except when absolutely necessary

### 7.4 Independent Package Publishing

- Each package can be published independently
- Versioning: manual or Changesets
- `prepublishOnly` ensures build before publish
- Each package has its own `README.md`

### 7.5 No Behavior Dependencies on User-Installed Versions

**Critical**: The behavior of `tinita` MUST NOT depend on which version of any other `@tinita/*` package the user installs.

Example:
- User installs `tinita@1.0.0` and `some-is-numeric-string@2.0.0`
- `tinita` must work exactly the same regardless of `some-is-numeric-string` version
- They are independent packages

---

## 8. Quality Standards (Big Tech Practices)

### 8.1 Code Quality

- ESLint + Prettier enforced on all packages
- No warnings allowed in production builds
- Consistent code style via shared configs

### 8.2 Test Coverage

- Every utility/hook/composable must have tests
- Unit tests in `tests/` directory
- Integration tests for complex interactions
- CI/CD runs tests on every commit

### 8.3 Documentation

- Each package has comprehensive `README.md`
- API documentation with TypeScript signatures
- Usage examples for every public function
- Migration guides for breaking changes

### 8.4 Semantic Versioning

Strict semver adherence:
- **Patch** (0.0.x): Bug fixes, no API changes
- **Minor** (0.x.0): New features, backward-compatible
- **Major** (x.0.0): Breaking changes

### 8.5 Performance

- Bundle size monitoring
- No unnecessary dependencies
- Lazy loading where appropriate
- Benchmarks for performance-critical utilities

---

## 9. Development Workflow

### 9.1 Adding a New Package

1. Create directory in `packages/`
2. Create `package.json` with proper exports
3. Create `tsconfig.json` extending shared config
4. Create `tsup.config.ts` with per-file builds
5. Create `src/index.ts`
6. Add to `pnpm-workspace.yaml` (if not using wildcard)
7. Create `README.md`
8. Add to Turborepo pipeline

### 9.2 Adding a New Utility to Existing Package

1. Create new file in `src/category/utility.ts`
2. Add to tsup `entry` array
3. Add subpath export to `package.json`
4. Export from `src/index.ts` (for barrel import)
5. Write tests in `tests/`
6. Document in package `README.md`
7. Run `pnpm build` and verify `dist/` output
8. Run `pnpm test` and ensure tests pass

### 9.3 Breaking Changes

When introducing breaking changes:
1. Document in `CHANGELOG.md`
2. Increment major version
3. Provide migration guide
4. Consider deprecation warnings in previous version
5. Update all affected packages in monorepo

---

## 10. Anti-Patterns (What NOT to Do)

### ❌ DON'T: Bundle Everything Together

```typescript
// BAD tsup.config.ts
export default defineConfig({
  entry: ['src/index.ts'],
  bundle: true, // ← WRONG: Bundles everything
});
```

### ❌ DON'T: Make Core Depend on Framework

```typescript
// tinita/src/something.ts
import { useState } from 'react'; // ← WRONG: Core can't depend on React
```

### ❌ DON'T: Bundle Framework Dependencies

```typescript
// tinita-react/tsup.config.ts
export default defineConfig({
  // Missing external: ['react'] ← WRONG: Will bundle React
});
```

### ❌ DON'T: Forget Subpath Exports

```json
{
  "exports": {
    ".": "./dist/index.mjs"
    // Missing individual utility exports ← WRONG: No tree-shaking
  }
}
```

### ❌ DON'T: Use Circular Dependencies

```typescript
// tinita/src/a.ts
import { b } from './b';

// tinita/src/b.ts
import { a } from './a'; // ← WRONG: Circular dependency
```

### ❌ DON'T: Skip Tests

```typescript
// Adding new utility without tests ← WRONG: All code must be tested
```

---

## 11. Checklist Summary

### Before Publishing Any Package

- [ ] All files build successfully
- [ ] All tests pass
- [ ] Linting passes with no warnings
- [ ] TypeScript compilation succeeds
- [ ] Subpath exports configured for all utilities
- [ ] README.md is complete and accurate
- [ ] Version bumped according to semver
- [ ] CHANGELOG.md updated
- [ ] No bundled framework dependencies (React/Vue)
- [ ] Tree-shaking verified (check bundle size)

### Architecture Compliance

- [ ] One file = one function/hook/composable
- [ ] Per-file builds configured
- [ ] No runtime dependency on micro-packages
- [ ] Framework code only in framework packages
- [ ] Core is framework-agnostic
- [ ] peerDependencies for frameworks
- [ ] Subpath exports for tree-shaking

---

## 12. References

- **Turborepo**: https://turborepo.com/
- **tsup**: https://tsup.egoist.dev/
- **Vitest**: https://vitest.dev/
- **pnpm Workspaces**: https://pnpm.io/workspaces
- **Package Exports**: https://nodejs.org/api/packages.html#exports

---

**This document is the source of truth for all architectural decisions in the tinita monorepo. When in doubt, refer to these principles.**
