# System Architecture

**Last Updated**: 2025-12-03
**Version**: 0.0.1
**Status**: Production Ready

## Overview

Tinita is a high-performance TypeScript monorepo built on modern tooling (Turborepo + pnpm + tsup) designed to deliver tree-shakeable utilities, React hooks, and UI components with zero runtime bloat. The architecture prioritizes module independence, optimal bundle sizes, and exceptional developer experience through strict structural patterns and automated workflows.

## Table of Contents

- [1. High-Level Architecture](#1-high-level-architecture)
- [2. Monorepo Structure](#2-monorepo-structure)
- [3. Package Dependency Graph](#3-package-dependency-graph)
- [4. Build System Architecture](#4-build-system-architecture)
- [5. Module Resolution Strategy](#5-module-resolution-strategy)
- [6. CSS Architecture](#6-css-architecture)
- [7. Development Workflow](#7-development-workflow)
- [8. Production Build Pipeline](#8-production-build-pipeline)
- [9. Export Generation System](#9-export-generation-system)
- [10. Data Flow](#10-data-flow)

---

## 1. High-Level Architecture

### 1.1 Architectural Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      Consumer Applications                       │
│                  (React Apps, Vue Apps, Node.js)                │
└────────────────────────┬────────────────────────────────────────┘
                         │ Import from NPM
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Published Packages Layer                      │
├─────────────────┬──────────────────┬────────────────────────────┤
│  tinita (core)  │  tinita-react    │  tinita-vue (planned)     │
│  Framework-     │  React Hooks +   │  Vue 3 Composables        │
│  Agnostic Utils │  UI Components   │                           │
└─────────────────┴──────────────────┴────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Monorepo Infrastructure                       │
├─────────────────┬──────────────────┬────────────────────────────┤
│  Turborepo      │  pnpm Workspaces │  Shared Configs           │
│  Task Orchestr. │  Dependency Mgmt │  ESLint/TS/Prettier       │
└─────────────────┴──────────────────┴────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Build Tools Layer                           │
├─────────────────┬──────────────────┬────────────────────────────┤
│  tsup (esbuild) │  Vitest (Tests)  │  CSS Build Scripts        │
│  Per-file builds│  Fast unit tests │  PostCSS + Tailwind       │
└─────────────────┴──────────────────┴────────────────────────────┘
```

### 1.2 Core Principles

**Zero Runtime Dependencies** (Core Package):
- `tinita` has ZERO external runtime dependencies
- Framework packages only depend on their respective frameworks (as peerDependencies)
- No micro-package runtime dependencies (Lodash pattern)

**Framework Isolation**:
- Core utilities: Pure TypeScript, environment-agnostic
- React code: Only in `tinita-react` package
- Vue code: Only in `tinita-vue` package (planned)
- No cross-contamination between framework layers

**Tree-Shaking First**:
- One file = one function/hook/composable
- Per-file builds with `bundle: false`
- Explicit subpath exports for every utility
- No side effects in module initialization

---

## 2. Monorepo Structure

### 2.1 Directory Tree

```
tinita/
├── packages/                      # Publishable packages
│   ├── tinita/                   # Core utilities (0 dependencies)
│   │   ├── src/
│   │   │   ├── file/            # File utilities
│   │   │   │   ├── fileSize.ts
│   │   │   │   ├── getFileNameParts.ts
│   │   │   │   └── truncateFileName.ts
│   │   │   ├── uuid/            # UUID generation
│   │   │   │   └── generateUUID.ts
│   │   │   └── index.ts         # Barrel exports
│   │   ├── tests/               # Vitest test suites
│   │   ├── dist/                # Build output (ESM + CJS)
│   │   ├── package.json         # Subpath exports config
│   │   └── tsup.config.ts       # Build configuration
│   │
│   └── tinita-react/            # React ecosystem
│       ├── src/
│       │   ├── hooks/           # React hooks (single-file)
│       │   │   ├── useToggle.ts
│       │   │   └── index.ts     # Hooks barrel
│       │   ├── ui/              # UI components (folder-based)
│       │   │   ├── FileTree/    # Component colocation
│       │   │   │   ├── FileTree.tsx      # Main component
│       │   │   │   ├── FileTree.css      # Component styles
│       │   │   │   ├── components/       # Private subcomponents
│       │   │   │   ├── utils/            # Component utilities
│       │   │   │   └── index.tsx         # Re-exports
│       │   │   ├── ping/
│       │   │   └── index.ts     # UI barrel
│       │   ├── utils/           # Shared utilities
│       │   │   └── autoInjectStyles.ts
│       │   ├── styles/          # Global styles
│       │   │   └── tailwind.css
│       │   └── index.ts         # Empty (no barrel export)
│       ├── scripts/
│       │   └── build-css.mjs    # CSS build automation
│       ├── dist/                # Build output
│       ├── .storybook/          # Component documentation
│       └── package.json         # CSS exports included
│
├── config/                       # Shared configuration packages
│   ├── eslint-config/           # ESLint presets (base, react, next)
│   ├── typescript-config/       # TS configs (base, react, vue, nextjs)
│   └── ui/                      # Internal shared components
│
├── scripts/                      # Build automation
│   ├── generate-package-exports.mjs  # Auto-generate exports
│   ├── publish.mjs                   # Publishing automation
│   └── update-package-versions.mjs   # Version management
│
├── docs/                         # Project documentation
│   ├── project-overview-pdr.md
│   ├── codebase-summary.md
│   ├── code-standards.md
│   └── system-architecture.md (this file)
│
├── turbo.json                    # Turborepo task pipeline
├── pnpm-workspace.yaml          # pnpm workspaces config
├── package.json                 # Root workspace config
├── ARCHITECTURE.md              # Architectural principles
├── CONTRIBUTING.md              # Contribution guidelines
└── CLAUDE.md                    # AI assistant instructions
```

### 2.2 Package Boundaries

**Clear Separation of Concerns**:

```
┌────────────────────────────────────────────────────────────┐
│                     tinita (Core)                          │
│  • File utilities (fileSize, truncateFileName, etc.)      │
│  • UUID generation (cross-platform)                       │
│  • String helpers (planned)                               │
│  • Number utilities (planned)                             │
│  • Pure TypeScript, zero dependencies                     │
└────────────────────────────────────────────────────────────┘
                         ▲
                         │ Can depend on core
                         │
┌────────────────────────┴───────────────────────────────────┐
│                  tinita-react                              │
│  • React hooks (useToggle, useDebounce, etc.)             │
│  • UI components (FileTree, Ping, etc.)                   │
│  • CSS files (separate from JS)                           │
│  • peerDependencies: React >= 18.0.0                      │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                  tinita-vue (Planned)                      │
│  • Vue composables (useToggle, useDebounce, etc.)         │
│  • peerDependencies: Vue >= 3.0.0                         │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                Config Packages (Internal)                  │
│  • @repo/eslint-config                                     │
│  • @repo/typescript-config                                 │
│  • @repo/ui (shared internal components)                  │
│  • NOT published to NPM                                    │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Package Dependency Graph

### 3.1 Runtime Dependencies

```
User Application
        │
        ├─────► tinita (core)
        │           └─── [Zero runtime dependencies]
        │
        ├─────► tinita-react
        │           ├─── peerDependencies: React >= 18.0.0
        │           ├─── dependencies:
        │           │       ├─── @radix-ui/react-accordion ^1.2.12
        │           │       ├─── lucide-react ^0.555.0
        │           │       └─── motion ^12.23.25
        │           └─── (Optional) tinita (if using core utilities)
        │
        └─────► tinita-vue (planned)
                    └─── peerDependencies: Vue >= 3.0.0
```

**Key Points**:
- **Framework Externalization**: React/Vue are NEVER bundled
- **User-Controlled Versions**: Users provide their own framework versions
- **No Micro-Package Dependencies**: Core package is self-contained

### 3.2 Development Dependencies

```
Root Workspace
    │
    ├─── Turborepo 2.6.1 (task orchestration)
    ├─── pnpm 9.0.0 (package manager)
    ├─── TypeScript 5.9.2 (type system)
    ├─── Vitest 4.0.14 (testing)
    ├─── ESLint 9.39.1 (linting)
    └─── Prettier 3.6.2 (formatting)

All Packages Inherit
    │
    ├─── @repo/eslint-config (shared ESLint rules)
    ├─── @repo/typescript-config (shared TS configs)
    └─── rimraf 6.1.2 (cross-platform cleanup)

Package-Specific
    │
    ├─── tinita:
    │       └─── tsup 8.5.1 (bundler)
    │
    └─── tinita-react:
            ├─── tsup 8.5.1 (bundler)
            ├─── Storybook 10.1.2 (component docs)
            ├─── Tailwind CSS 4.1.17 (utility CSS)
            ├─── PostCSS 8.5.6 (CSS processing)
            └─── @testing-library/react 16.3.0 (component testing)
```

---

## 4. Build System Architecture

### 4.1 Turborepo Task Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    Turborepo Task Graph                          │
└─────────────────────────────────────────────────────────────────┘

generate:exports ─┐
                  │
                  ├──► build ─┐
                  │            │
^build ───────────┘            ├──► test
                               │
                               └──► check-types

lint ◄──── ^lint

dev (persistent, not cached)


Task Definitions:

┌──────────────────┬──────────────────────────────────────────────┐
│ Task             │ Configuration                                │
├──────────────────┼──────────────────────────────────────────────┤
│ generate:exports │ • Scans src/ for TypeScript files          │
│                  │ • Updates package.json exports             │
│                  │ • Updates tsup.config.ts entries           │
│                  │ • Creates barrel exports in index.ts       │
│                  │ • Cached based on src/ changes             │
├──────────────────┼──────────────────────────────────────────────┤
│ build            │ • Depends on: ^build, generate:exports     │
│                  │ • Runs tsup (per-file builds)              │
│                  │ • Outputs: dist/**                         │
│                  │ • Cached based on src/ and config changes  │
├──────────────────┼──────────────────────────────────────────────┤
│ test             │ • Depends on: build                        │
│                  │ • Runs Vitest                              │
│                  │ • No cache output                          │
├──────────────────┼──────────────────────────────────────────────┤
│ lint             │ • Depends on: ^lint                        │
│                  │ • Runs ESLint                              │
│                  │ • Cached                                   │
├──────────────────┼──────────────────────────────────────────────┤
│ check-types      │ • Depends on: ^check-types                 │
│                  │ • Runs tsc --noEmit                        │
│                  │ • Cached                                   │
├──────────────────┼──────────────────────────────────────────────┤
│ dev              │ • No dependencies                          │
│                  │ • Persistent (watch mode)                  │
│                  │ • Not cached                               │
└──────────────────┴──────────────────────────────────────────────┘
```

### 4.2 tsup Build Configuration

**Core Package (tinita)**:

```typescript
// packages/tinita/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',              // Barrel entry
    'src/file/fileSize.ts',      // Individual utilities
    'src/file/getFileNameParts.ts',
    'src/file/truncateFileName.ts',
    'src/uuid/generateUUID.ts',
  ],
  format: ['cjs', 'esm'],        // Dual format support
  dts: true,                     // Generate .d.ts files
  bundle: false,                 // CRITICAL: No bundling
  splitting: false,              // No code splitting
  clean: true,                   // Clean dist/ before build
  outDir: 'dist'                 // Output directory
});
```

**Output Structure**:
```
dist/
├── index.mjs           ┐
├── index.cjs           ├─ Barrel exports
├── index.d.ts          ┘
├── file/
│   ├── fileSize.mjs    ┐
│   ├── fileSize.cjs    ├─ Individual utility (tree-shakeable)
│   ├── fileSize.d.ts   ┘
│   ├── getFileNameParts.mjs
│   ├── getFileNameParts.cjs
│   ├── getFileNameParts.d.ts
│   └── ...
└── uuid/
    ├── generateUUID.mjs
    ├── generateUUID.cjs
    └── generateUUID.d.ts
```

**React Package (tinita-react)**:

```typescript
// packages/tinita-react/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/hooks/useToggle.ts',
    'src/ui/FileTree/index.tsx',
    'src/ui/ping/index.ts',
    'src/utils/autoInjectStyles.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  bundle: false,
  external: ['react', 'react-dom'],  // CRITICAL: Never bundle frameworks
  splitting: false,
  clean: true,
  outDir: 'dist'
});
```

**CSS Build Pipeline** (tinita-react):

```javascript
// packages/tinita-react/scripts/build-css.mjs

Step 1: Copy CSS Files
  src/ui/FileTree/FileTree.css  ──► dist/ui/FileTree/FileTree.css
  src/ui/Component/Component.css ──► dist/ui/Component/Component.css

Step 2: Bundle All CSS
  dist/**/*.css ──► dist/styles.css (combined)

Step 3: Process Tailwind
  src/styles/tailwind.css ──► dist/tailwind.css (processed with PostCSS)
```

---

## 5. Module Resolution Strategy

### 5.1 Subpath Exports (Tree-Shaking Guarantee)

**Package.json Exports Structure**:

```json
{
  "name": "tinita",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./file/fileSize": {
      "types": "./dist/file/fileSize.d.ts",
      "import": "./dist/file/fileSize.mjs",
      "require": "./dist/file/fileSize.cjs"
    },
    "./file/getFileNameParts": {
      "types": "./dist/file/getFileNameParts.d.ts",
      "import": "./dist/file/getFileNameParts.mjs",
      "require": "./dist/file/getFileNameParts.cjs"
    }
  }
}
```

### 5.2 Import Patterns

**Core Package (tinita)**:

```typescript
// ✅ Barrel Import (Convenience)
import { fileSize } from 'tinita';

// ✅ Subpath Import (Optimal Tree-Shaking)
import { fileSize } from 'tinita/file/fileSize';
```

**React Package (tinita-react)**:

```typescript
// ❌ FORBIDDEN: Main entry import
import { useToggle } from 'tinita-react';  // Won't work

// ✅ Category Barrel Import
import { useToggle } from 'tinita-react/hooks';
import { FileTree } from 'tinita-react/ui';

// ✅ Subpath Import (Optimal)
import { useToggle } from 'tinita-react/hooks/useToggle';
import { FileTree } from 'tinita-react/ui/FileTree';
```

**CSS Imports**:

```typescript
// Manual import (production)
import 'tinita-react/styles.css';  // All component styles
// or
import 'tinita-react/ui/FileTree/FileTree.css';  // Specific component

// Auto-inject (development)
<FileTree data={data} />  // autoInjectStyles defaults to true
```

### 5.3 Module Resolution Flow

```
User Code: import { fileSize } from 'tinita/file/fileSize'
    │
    ▼
Node.js Module Resolution
    │
    ├─ Check package.json "exports" field
    │       └─ "./file/fileSize" ──► "./dist/file/fileSize.mjs" (ESM)
    │                            └─► "./dist/file/fileSize.cjs" (CJS)
    │
    ▼
Bundler (Vite/Webpack/Rollup)
    │
    ├─ ESM Import: Load dist/file/fileSize.mjs
    │       └─ Tree-shake: Only this module included
    │
    └─ Type Checking: Load dist/file/fileSize.d.ts
            └─ IntelliSense: Show types and JSDoc
```

---

## 6. CSS Architecture

### 6.1 CSS Separation Strategy

**Design Philosophy**: CSS-first, not CSS-in-JS

```
┌─────────────────────────────────────────────────────────────┐
│                 CSS Build Process                           │
└─────────────────────────────────────────────────────────────┘

Source:
  src/ui/FileTree/FileTree.css
  src/ui/Component/Component.css
        │
        ▼
Step 1: Copy to dist/
  dist/ui/FileTree/FileTree.css
  dist/ui/Component/Component.css
        │
        ▼
Step 2: Bundle all CSS
  dist/styles.css (all component styles combined)
        │
        ▼
Step 3: Process Tailwind
  dist/tailwind.css (processed with PostCSS)
        │
        ▼
Package Exports:
  "exports": {
    "./styles.css": "./dist/styles.css",
    "./tailwind.css": "./dist/tailwind.css",
    "./ui/FileTree/FileTree.css": "./dist/ui/FileTree/FileTree.css"
  }
```

### 6.2 CSS Usage Modes

**Mode 1: Manual Import (Production)**

```typescript
// In root App.tsx or _app.tsx
import 'tinita-react/styles.css';  // Import once

// Use components
import { FileTree } from 'tinita-react/ui';
<FileTree data={data} autoInjectStyles={false} />
```

**Mode 2: Auto-Inject (Development)**

```typescript
// No CSS import needed
import { FileTree } from 'tinita-react/ui';
<FileTree data={data} />  // autoInjectStyles defaults to true

// Component automatically injects styles via useEffect
```

**Auto-Inject Implementation**:

```typescript
// Component implementation
import { useEffect } from 'react';
import { autoInjectStyles } from '../../utils/autoInjectStyles';

const CSS_CONTENT = `/* Component CSS */`;

export function FileTree({ autoInjectStyles: shouldAutoInject = true, ...props }) {
  useEffect(() => {
    if (shouldAutoInject && typeof window !== 'undefined') {
      autoInjectStyles('tinita-filetree-styles', CSS_CONTENT);
    }
  }, [shouldAutoInject]);

  return <div className="tinita-filetree">...</div>;
}
```

### 6.3 CSS Naming Convention

**BEM-like with Prefix**:

```css
/* Block */
.tinita-filetree { }

/* Element */
.tinita-filetree__item { }

/* Modifier */
.tinita-filetree__item--selected { }
```

**CSS Variables**:

```css
:root {
  --tinita-filetree-bg: #ffffff;
  --tinita-filetree-text: #000000;
  --tinita-filetree-border: #e0e0e0;
  --tinita-filetree-hover: #f5f5f5;
}

.tinita-filetree {
  background-color: var(--tinita-filetree-bg);
  color: var(--tinita-filetree-text);
}
```

---

## 7. Development Workflow

### 7.1 Local Development Loop

```
Developer Action: Add new utility
        │
        ▼
Step 1: Create file (e.g., src/string/isEmpty.ts)
        │
        ▼
Step 2: Run export generator
  $ pnpm run generate:exports
        │
        ├─ Updates package.json exports
        ├─ Updates tsup.config.ts entries
        └─ Updates src/index.ts barrel
        │
        ▼
Step 3: Write tests (tests/string.test.ts)
        │
        ▼
Step 4: Build and test
  $ pnpm build && pnpm test
        │
        ├─ Turborepo: generate:exports (cached if no changes)
        ├─ Turborepo: build (runs tsup)
        └─ Vitest: run tests
        │
        ▼
Step 5: Verify import
  import { isEmpty } from 'tinita/string/isEmpty'
```

### 7.2 Hot Reload in Dev Mode

```
$ pnpm dev
    │
    ├─ packages/tinita: tsup --watch
    │       └─ Rebuilds on src/ file changes
    │
    └─ packages/tinita-react: tsup --watch
            └─ Rebuilds on src/ file changes

Consumer app (e.g., Next.js)
    │
    └─ Watches node_modules/tinita/dist/
            └─ Hot reloads when dist/ changes
```

---

## 8. Production Build Pipeline

### 8.1 Full Build Sequence

```
Step 1: Clean previous builds
  $ pnpm clean (rimraf dist/)

Step 2: Generate exports
  $ pnpm run generate:exports
        │
        └─ Updates package.json, tsup.config.ts, index.ts

Step 3: Turborepo orchestrated build
  $ pnpm build
        │
        ├─ Dependency graph analysis
        │       └─ config/* packages (no build needed)
        │
        ├─ packages/tinita
        │       ├─ generate:exports (from Step 2)
        │       ├─ tsup build
        │       │   ├─ Compile TypeScript
        │       │   ├─ Generate .d.ts files
        │       │   └─ Output: dist/**/*.{mjs,cjs,d.ts}
        │       └─ Success ✓
        │
        └─ packages/tinita-react
                ├─ generate:exports (from Step 2)
                ├─ tsup build (JavaScript)
                │   ├─ Compile TypeScript/TSX
                │   ├─ Generate .d.ts files
                │   ├─ External: react, react-dom
                │   └─ Output: dist/**/*.{mjs,cjs,d.ts}
                ├─ build:css (CSS)
                │   ├─ Copy CSS files to dist/
                │   ├─ Bundle into dist/styles.css
                │   └─ Process Tailwind to dist/tailwind.css
                └─ Success ✓

Step 4: Type checking
  $ pnpm check-types
        │
        └─ tsc --noEmit (all packages)

Step 5: Run tests
  $ pnpm test
        │
        └─ Vitest (all packages)

Step 6: Linting
  $ pnpm lint
        │
        └─ ESLint (all packages)
```

### 8.2 Publishing Pipeline

```
Pre-Publish Checks
    │
    ├─ All tests pass
    ├─ Linting passes
    ├─ Type checking passes
    ├─ Build succeeds
    └─ Version bumped

Publishing (via scripts/publish.mjs)
    │
    ├─ Single package: pnpm publish:tinita
    │       └─ npm publish --access public --provenance
    │
    └─ All packages: pnpm publish:all
            ├─ packages/tinita
            └─ packages/tinita-react

Post-Publish
    │
    └─ NPM Registry
            ├─ tinita@x.x.x (available)
            └─ tinita-react@x.x.x (available)
```

---

## 9. Export Generation System

### 9.1 Automated Export Generator

**Script**: `scripts/generate-package-exports.mjs`

```
Execution: pnpm run generate:exports (from package directory)

Process Flow:
    │
Step 1: Scan src/ directory
    │
    ├─ Find all .ts and .tsx files
    ├─ Exclude: index.ts, *.test.ts, *.stories.tsx
    └─ Categorize: single-file vs folder-based
    │
Step 2: Generate package.json exports
    │
    ├─ Main entry: "." → "./dist/index.{mjs,cjs}"
    ├─ Subpath exports: each utility/component
    │       └─ "./category/utility" → "./dist/category/utility.{mjs,cjs}"
    └─ Types: "./dist/.../*.d.ts"
    │
Step 3: Update tsup.config.ts
    │
    ├─ entry: ['src/index.ts', ...]
    └─ Add each source file path
    │
Step 4: Update src/index.ts (barrel exports)
    │
    ├─ export * from './category/utility';
    └─ For all utilities
    │
Step 5: Framework-specific handling
    │
    ├─ React packages: Add external: ['react', 'react-dom']
    └─ Vue packages: Add external: ['vue']
```

### 9.2 Manual vs Automated

**Automated (tinita core)**:
- ✅ Single-file utilities
- ✅ Simple directory structures
- ✅ Consistent patterns

**Manual (tinita-react UI)**:
- ⚠️ Complex component structures
- ⚠️ CSS exports
- ⚠️ Category barrels (hooks/, ui/)

**Workflow**:
```
tinita package:
  $ pnpm run generate:exports  ← Fully automated

tinita-react package:
  $ pnpm run generate:exports  ← Partial automation
  $ (Manual) Update package.json for CSS exports
  $ (Manual) Update hooks/index.ts and ui/index.ts barrels
```

---

## 10. Data Flow

### 10.1 Utility Usage Flow

```
User Application Code
    │
    │  import { fileSize } from 'tinita/file/fileSize'
    │
    ▼
Node.js/Bundler Module Resolution
    │
    │  Reads: tinita/package.json "exports"
    │  Resolves: "./file/fileSize" → "./dist/file/fileSize.mjs"
    │
    ▼
Load Module (ESM)
    │
    │  dist/file/fileSize.mjs:
    │    export function fileSize(size, base = 1000) { ... }
    │
    ▼
TypeScript Type Checking
    │
    │  Loads: dist/file/fileSize.d.ts
    │  Provides: IntelliSense and type safety
    │
    ▼
Bundler Tree-Shaking
    │
    │  Only includes: fileSize function code
    │  Excludes: All other tinita utilities
    │
    ▼
Production Bundle
    │
    └─► Minimal size: ~500 bytes for fileSize
```

### 10.2 React Component Usage Flow

```
User Application Code
    │
    │  import { FileTree } from 'tinita-react/ui'
    │  import 'tinita-react/styles.css'  (manual mode)
    │
    ▼
Module Resolution
    │
    ├─ JavaScript: tinita-react/dist/ui/index.mjs
    │       └─ export { FileTree } from './FileTree'
    │
    └─ CSS: tinita-react/dist/styles.css
            └─ .tinita-filetree { ... }
    │
    ▼
Component Render
    │
    │  <FileTree data={treeData} />
    │
    ├─ If autoInjectStyles=true (dev mode):
    │       └─ useEffect(() => autoInjectStyles(...))
    │
    └─ If autoInjectStyles=false (prod mode):
            └─ Uses externally imported CSS
    │
    ▼
Browser Rendering
    │
    ├─ HTML: <div class="tinita-filetree">...</div>
    └─ CSS: Applied from <style> or <link>
```

### 10.3 Monorepo Package Communication

```
Development (Workspace)
    │
    ├─ packages/tinita-react/package.json
    │       └─ "dependencies": { "tinita": "workspace:*" }
    │
    └─ pnpm link: tinita-react → tinita (via workspace)
            └─ Import: import { isNumber } from 'tinita/...'

Build Time
    │
    ├─ Turborepo: Build tinita first (^build dependency)
    │       └─ Output: packages/tinita/dist/
    │
    └─ Turborepo: Build tinita-react second
            └─ Resolves: tinita imports from dist/

Publishing (NPM)
    │
    ├─ tinita published: tinita@1.0.0
    │
    └─ tinita-react published: tinita-react@1.0.0
            └─ package.json: No runtime dependency on tinita
                (unless explicitly needed)
```

---

## Summary

The Tinita architecture delivers on three core promises:

1. **Zero Bundle Bloat**: One file = one function, per-file builds, explicit subpath exports ensure users only ship what they import.

2. **Framework Independence**: Clear package boundaries prevent framework code from contaminating core utilities. React, Vue, and other frameworks are peer dependencies, never bundled.

3. **Developer Velocity**: Automated export generation, Turborepo task orchestration, and hot reload in dev mode enable rapid development without sacrificing quality.

The system is designed to scale from the current 4 utilities to 100+ without architectural changes, supporting the long-term vision of Tinita as a comprehensive utility ecosystem.

---

## Related Documentation

- [Project Overview & PDR](./project-overview-pdr.md) - Product requirements and roadmap
- [Codebase Summary](./codebase-summary.md) - Current state and metrics
- [Code Standards](./code-standards.md) - Coding conventions and quality standards
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Detailed architectural principles
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution workflow
- [CLAUDE.md](../CLAUDE.md) - AI assistant instructions
