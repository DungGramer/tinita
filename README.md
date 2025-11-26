# Tinita

Tinita is a modular, framework-agnostic toolkit designed for long-term maintainability across multi-stack projects (TypeScript, React, Vue, Node.js). It provides a curated collection of utilities, hooks, and shared tooling—implemented with a strict structure to ensure maximum tree-shaking and zero runtime bloat.

Tinita is built around the principles of:

* Lightweight per-function modules
* Predictable and stable architecture
* Cross-framework compatibility
* Composable, future-proof utility design

Tinita is structured as a **monorepo** powered by **pnpm** and **Turborepo**, delivering high build performance and granular package control.

---

## Features

* **Tree-shakeable utilities** with per-file builds
* **React hooks** and **Vue composables** following best practices
* **Node.js helpers** for backend and tooling environments
* **Config packages** (ESLint, TS Config, Prettier presets) to standardize project development
* **No bundle bloat**: users only ship what they import
* **Modular package design** with subpath exports
* **TypeScript-first** with full `.d.ts` generation

---

## Repository Structure

```
tinita/
  package.json
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json

  packages/
    tinita/        # Framework-agnostic utilities
    tinita-react/  # React hooks
    tinita-vue/    # Vue composables
    tinita-node/   # Node.js utilities
    config/        # Shared configs
```

---

## Packages

### `tinita`

Pure TypeScript utilities including type guards, validators, and helper functions organized by domain (number, string, file, UUID, etc.).

```ts
// Barrel import
import { isNumber } from 'tinita';

// Subpath import (optimal tree-shaking)
import { isNumber } from 'tinita/number/isNumber';
```

### `tinita-react`

React hooks for common use cases with TypeScript support and zero dependencies.

```ts
import { useDebounce } from 'tinita-react';
```

### `tinita-vue`

Vue composables following Vue 3 composition API patterns.

```ts
import { useDebounce } from 'tinita-vue';
```

### `tinita-node`

Node.js-specific utilities for server-side applications.

---

## Installation

Install only the packages you need:

```bash
pnpm add tinita
pnpm add tinita-react
pnpm add tinita-vue
```

---

## Philosophy

Tinita is built for developers who:

* Work across multiple frameworks
* Need clean, reusable building blocks
* Want strict control over build output
* Avoid the pitfalls of monolithic libraries (like Moment.js)

Each function or hook exists as its own file, and subpath exports ensure that bundlers can easily tree-shake unused code.

---

## Development

### Requirements

* Node >= 18
* pnpm

### Install dependencies

```bash
pnpm install
```

### Build all packages

```bash
pnpm build
```

### Run tests

```bash
pnpm test
```

### Lint all packages

```bash
pnpm lint
```

---

## Contribution Guidelines

See `CONTRIBUTING.md` for rules about:

* project structure
* naming conventions
* adding a new utility/hook
* subpath export requirements
* testing standards

---

## License

MIT License.

---

## Status

Tinita is in early development and evolving toward a production-grade shared utility ecosystem. Contributions and architecture feedback are welcome.
