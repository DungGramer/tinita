# DOCUMENT_REQUIRED.md

This document defines all required information for initializing the **tinita** project using automated agents (e.g., Claude). It establishes structure, conventions, and project rules to ensure deterministic setup in monorepo and package scaffolding.

---

## 1. Project Overview

**tinita** is a multi‑package monorepo designed to provide:

* Core utilities (framework‑agnostic)
* React hooks
* Vue composables
* Node utilities
* Shared tooling (lint configs, ts configs)

Scope is tech‑neutral, modular, and tree‑shakeable.

---

## 2. Monorepo Requirements

* Package manager: **pnpm**
* Monorepo engine: **Turborepo**
* Structure:

  ```txt
  tinita/
    package.json
    pnpm-workspace.yaml
    turbo.json
    packages/
      core/
      react/
      vue/
      node/
      config/
  ```
* All packages must be published under scope (example): `@tinita/*`.
* Each package must be independent and tree‑shakeable (per-file outputs).

---

## 3. Build System Requirements

* Build tool: **tsup**
* Output formats: `esm` + `cjs`
* Type definitions: required (`.d.ts`)
* No bundling for util packages (`bundle: false`) except when explicitly overridden.
* Directory outputs:

  ```txt
  dist/
    <module>.mjs
    <module>.cjs
    <module>.d.ts
  ```

---

## 4. TypeScript Requirements

* All packages must contain:

  * `tsconfig.json`
  * `src/` directory
* Root `tsconfig.base.json` must define global compiler settings.
* Path alias for internal sharing:

  ```json
  {
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@tinita-internal/*": ["packages/core/src/*"]
      }
    }
  }
  ```

---

## 5. Package Requirements

Every package must contain:

* `package.json`
* `src/index.ts`
* `README.md`
* Build script
* Lint script

Example minimal package.json fields:

```json
{
  "name": "@tinita/<package-name>",
  "version": "0.0.0",
  "main": "dist/index.cjs",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "lint": "eslint src --ext .ts",
    "prepublishOnly": "npm run build"
  }
}
```

---

## 6. Subpath Export Rules

* Subpath exports must be defined for every util/hook.
* Example:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./number/isPositive": {
      "import": "./dist/number/isPositive.mjs",
      "require": "./dist/number/isPositive.cjs",
      "types": "./dist/number/isPositive.d.ts"
    }
  }
}
```

---

## 7. Tree‑Shaking Requirements

tinita must enforce:

1. One file = one function/composable/hook.
2. No deep re-exporting unless documented.
3. `bundle: false` so the build preserves module boundaries.
4. Subpath import must always work:

   ```ts
   import isPositive from '@tinita/core/number/isPositive';
   ```

---

## 8. Lint & Format Requirements

* ESLint + Prettier required.
* Root config recommended.
* Rules must apply to all packages.

---

## 9. Testing Requirements

* Testing framework: **Vitest**
* Tests stored in:

  ```txt
  <package>/tests/*.test.ts
  ```

---

## 10. Version & Release Requirements

* Versioning: manual or via Changesets (optional).
* Each package must be publish‑ready individually.

---

## 11. Documentation Requirements

Each package must have:

* `README.md`: usage + API + import examples
* Root must have:

  * `CONTRIBUTING.md`
  * `DOCUMENT_REQUIRED.md` (this file)

---

## 12. Initialization Instructions (for Claude or other agents)

When initializing the project:

1. Create root monorepo scaffold (pnpm + turbo + base tsconfig).
2. Create packages:

   * `core`
   * `react`
   * `vue`
   * `node`
   * `config`
3. Setup tsup configs for each package.
4. Setup ESLint + Prettier + Vitest in root.
5. Implement example modules:

   * `core`: `isNumber`, `isPositive`
   * `react`: `useDebounce`
   * `vue`: `useDebounce`
6. Ensure subpath exports are configured.
7. Ensure tests run across monorepo.

This document should be used as a **source of truth** for automated initialization processes.
