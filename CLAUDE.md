# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Documentation

**Before making any changes, read [ARCHITECTURE.md](./ARCHITECTURE.md)** - This document contains critical architectural principles, compliance rules, and design patterns that MUST be followed.

## Project Overview

**Tinita** is a multi-package monorepo designed to provide framework-agnostic utilities, React hooks, Vue composables, Node utilities, and shared tooling. The project emphasizes modularity, tree-shakeability, and independent package publishing under the `tinita` scope (not `@tinita/`).

## Monorepo Architecture

This is a **Turborepo** monorepo managed with **pnpm** workspaces:

- **Package manager**: pnpm (v9.0.0)
- **Build orchestration**: Turborepo
- **Node version**: >=18

### Directory Structure

```
tinita/
  ├── packages/          # Main publishable packages
  │   ├── tinita/        # Framework-agnostic utilities
  │   └── tinita-react/  # React hooks and UI components
  │       ├── src/
  │       │   ├── hooks/      # React hooks (single-file)
  │       │   └── ui/         # UI components (folder-based)
  ├── config/            # Shared configuration packages
  │   ├── eslint-config/ # ESLint configurations (@repo/eslint-config)
  │   ├── typescript-config/ # TypeScript configurations (@repo/typescript-config)
  │   └── ui/            # Shared React components (@repo/ui)
  ├── scripts/           # Build automation scripts
  ├── turbo.json         # Turborepo task configuration
  └── pnpm-workspace.yaml
```

## Development Commands

### Build
```bash
# Build all packages
pnpm build
# or
turbo build

# Build specific package
turbo build --filter=tinita
```

### Development
```bash
# Run dev mode for all packages
pnpm dev
# or
turbo dev

# Dev mode for specific package
turbo dev --filter=tinita
```

### Linting & Type Checking
```bash
# Lint all packages
pnpm lint
# or
turbo lint

# Type check all packages
pnpm check-types
# or
turbo check-types
```

### Testing
```bash
# Run all tests
pnpm test
# or
turbo test

# Run tests in watch mode
cd packages/tinita && pnpm test --watch

# Run tests with coverage
cd packages/tinita && pnpm test --coverage
```

### Formatting
```bash
# Format all TypeScript, TSX, and Markdown files
pnpm format
```

### Publishing
```bash
# Publish specific package (dry run)
pnpm publish:dry-run

# Publish specific package
pnpm publish:tinita
pnpm publish:tinita-react

# Publish all packages
pnpm publish:all
```

## Package Architecture & Build System

### Build Tool: tsup
All utility packages use **tsup** with the following requirements:

- **Output formats**: ESM (`.mjs`) + CJS (`.cjs`)
- **Type definitions**: Required (`.d.ts`)
- **No bundling**: Use `bundle: false` to preserve module boundaries for tree-shaking
- **Output directory**: `dist/`

Example tsup configuration pattern:
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/file/fileSize.ts', ...],
  format: ['cjs', 'esm'],
  dts: true,
  bundle: false,
  splitting: false,
  clean: true,
  outDir: 'dist'
});
```

### Package.json Structure
Every package must include:

```json
{
  "name": "tinita",
  "version": "0.0.1",
  "main": "dist/index.cjs",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "pnpm run clean && tsup",
    "lint": "eslint src --ext .ts",
    "test": "vitest",
    "prepublishOnly": "pnpm run generate:exports && pnpm run build"
  }
}
```

### Subpath Exports
All packages MUST define subpath exports for tree-shakeability:

```json
{
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
    }
  }
}
```

This enables users to import specific utilities:
```typescript
import { fileSize } from 'tinita/file/fileSize';
```

## Automated Export Generation

**IMPORTANT**: Tinita uses an automated script to generate exports, tsup entries, and barrel exports. This script should be run after adding new utilities.

### Auto-Generate Exports Command
```bash
# From package directory
cd packages/tinita
pnpm run generate:exports

# From root directory
node scripts/generate-package-exports.mjs packages/tinita
```

This script:
1. Scans `src/` directory for all `.ts` files (excluding `index.ts` and test files)
2. Generates `package.json` exports field
3. Updates `tsup.config.ts` entry array
4. Updates `src/index.ts` barrel exports

### Turbo Pipeline Integration
The `generate:exports` task runs automatically before `build` in the Turborepo pipeline:

```json
{
  "build": {
    "dependsOn": ["^build", "generate:exports"]
  }
}
```

## Tree-Shaking & Module Design

Critical rules for tree-shakeability:

1. **One file = one function/hook/composable** - Each utility must be in its own file
2. **No deep re-exporting** unless explicitly documented
3. **Preserve module boundaries** - Use `bundle: false` in tsup
4. **Subpath imports must always work** - Define explicit exports for every utility

### Package-Specific Import Rules

#### `tinita` (Core Package)
- ✅ Barrel imports allowed: `import { fileSize } from 'tinita'`
- ✅ Subpath imports encouraged: `import { fileSize } from 'tinita/file/fileSize'`

#### `tinita-react` (React Package)
- ❌ NO barrel imports: `import { useToggle } from 'tinita-react'` is **FORBIDDEN**
- ✅ MUST use explicit subpaths:
  - Hooks: `import { useToggle } from 'tinita-react/hooks'`
  - UI: `import { FileTree } from 'tinita-react/ui'`
  - Specific: `import { useToggle } from 'tinita-react/hooks/useToggle'`

**Rationale:** Enforcing explicit imports improves tree-shaking and makes it clear whether you're importing hooks or UI components.

## TypeScript Configuration

The monorepo uses shared TypeScript configurations from `config/typescript-config`:

- **base.json**: Base configuration with strict mode, ES2022 target, NodeNext module resolution
- **nextjs.json**: Next.js specific configuration
- **react-library.json**: React library configuration

Key compiler options enforced:
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `isolatedModules: true`
- `declaration: true` (for all packages)

## ESLint Configuration

Shared ESLint configs are in `config/eslint-config` with three presets:

- **base.js**: Base ESLint configuration
- **next.js**: Next.js specific rules
- **react-internal.js**: React component rules

## Testing

- **Framework**: Vitest
- **Test location**: `<package>/tests/*.test.ts`
- **Root config**: `vitest.config.ts`

## Turborepo Tasks

Tasks are configured in `turbo.json`:

- **generate:exports**: Generates package.json exports, tsup entries, and barrel exports
- **build**: Builds with dependency order (`dependsOn: ["^build", "generate:exports"]`)
- **lint**: Lints with dependency order
- **check-types**: Type checks with dependency order
- **test**: Runs after build
- **dev**: Development mode (not cached, persistent)

## Adding a New Utility Workflow

### For Framework-Agnostic Utilities (tinita)

When adding a new utility to `tinita`:

1. **Create the utility file** in appropriate directory (e.g., `src/string/isEmpty.ts`)
2. **Run the export generator**:
   ```bash
   cd packages/tinita
   pnpm run generate:exports
   ```
3. **Write tests** in `tests/` directory
4. **Build and verify**:
   ```bash
   pnpm build
   pnpm test
   ```
5. **Update package README** with usage examples

### For React Hooks (tinita-react)

When adding a new React hook:

1. **Create the hook file** in `src/hooks/` (e.g., `src/hooks/useDebounce.ts`)
   ```typescript
   // src/hooks/useDebounce.ts
   import { useState, useEffect } from 'react';

   export function useDebounce<T>(value: T, delay: number): T {
     // Hook implementation
   }
   ```

2. **Run the export generator**:
   ```bash
   cd packages/tinita-react
   pnpm run generate:exports
   ```

3. **Write tests** in `tests/hooks/`
4. **Build and verify**

The hook will be available as:
```typescript
import { useDebounce } from 'tinita-react';
// or
import { useDebounce } from 'tinita-react/hooks/useDebounce';
```

### For React UI Components (tinita-react)

**CRITICAL:** All UI components MUST follow the Component Colocation pattern.

#### Component Colocation Pattern (MANDATORY)

**Rule:**
- Main component MUST be in a separate file (e.g., `FileTree.tsx`), NOT in `index.tsx`
- `index.tsx` ONLY re-exports
- Private components MUST be grouped with their parent

**Why separate file + index.tsx?**
- **Discoverability**: Easy to find `FileTree.tsx` in file tree
- **Maintainability**: Clear separation between logic and barrel exports
- **Scalability**: Easy to add types, hooks, utils without cluttering index
- **Big Tech Standard**: Follows "1 file = 1 unit" convention (Meta, Google, Microsoft)

#### ❌ BAD - Logic in index.tsx:
```
src/ui/FileTree/
  ├── index.tsx           ← Component logic here (hard to search)
  ├── FileTreeNode.tsx
  └── FileTreeItem.tsx
```

#### ✅ GOOD - Separate main file + index re-export:
```
src/ui/FileTree/
  ├── FileTree.tsx        ← Main component logic (easy to find)
  ├── FileTreeNode.tsx    ← Private component
  ├── FileTreeItem.tsx    ← Private component
  └── index.tsx           ← Re-export only
```

#### Workflow:

1. **Create component folder** in `src/ui/`:
   ```
   src/ui/FileTree/
     ├── FileTree.tsx         # Main component (REQUIRED)
     ├── FileTreeNode.tsx     # Private components (optional)
     ├── FileTree.types.ts    # Type definitions (optional)
     └── index.tsx            # Re-exports (REQUIRED)
   ```

2. **Write main component**:
   ```typescript
   // src/ui/FileTree/FileTree.tsx
   export interface FileTreeProps {
     data: any[];
   }

   export function FileTree({ data }: FileTreeProps) {
     // Component implementation
   }
   ```

3. **Create re-export index**:
   ```typescript
   // src/ui/FileTree/index.tsx
   export { FileTree } from './FileTree';
   export type { FileTreeProps } from './FileTree';
   ```

4. **Update `src/ui/index.ts`** (barrel export for ui folder):
   ```typescript
   // src/ui/index.ts
   export * from './FileTree';
   export * from './Button';
   // ... other components
   ```

5. **Update `package.json` exports**:
   ```json
   {
     "exports": {
       "./ui": {
         "types": "./dist/ui/index.d.ts",
         "import": "./dist/ui/index.mjs",
         "require": "./dist/ui/index.cjs"
       },
       "./ui/FileTree": {
         "types": "./dist/ui/FileTree/index.d.ts",
         "import": "./dist/ui/FileTree/index.mjs",
         "require": "./dist/ui/FileTree/index.cjs"
       }
     }
   }
   ```

6. **Update `tsup.config.ts`**:
   ```typescript
   export default defineConfig({
     entry: [
       'src/index.ts',
       'src/ui/index.ts',
       'src/ui/FileTree/index.tsx',
       // ... other entries
     ],
     // ...
   });
   ```

7. **Write tests** in `tests/ui/FileTree.test.tsx`
8. **Build and verify**

The component will be available as:
```typescript
// Barrel import from ui
import { FileTree } from 'tinita-react/ui';

// Direct import
import { FileTree } from 'tinita-react/ui/FileTree';
```

## CSS Handling for UI Components (CRITICAL)

All UI components MUST follow the **plug-and-play CSS approach** used by production libraries (Radix UI, HeadlessUI, MUI, Ant Design).

### CSS Architecture Principles

1. **CSS files are separate** - Never bundle CSS with JS
2. **Manual import supported** - Works in all environments
3. **Auto-inject available** - Optional convenience feature
4. **CSS variables for theming** - Easy customization
5. **SSR-compatible** - Works with Next.js, Remix, etc.
6. **No-JS fallback** - Graceful degradation
7. **Prefix all classes** - `tinita-{component}` convention

### CSS File Structure

Every UI component with styles MUST have:

```
src/ui/ComponentName/
  ├── ComponentName.tsx       # Component logic
  ├── ComponentName.css       # Component styles (REQUIRED if styled)
  ├── index.tsx               # Re-export
  └── README.md               # Usage docs (optional)
```

### CSS Naming Convention (BEM-like)

```css
/* Block */
.tinita-filetree { }

/* Element */
.tinita-filetree__item { }

/* Modifier */
.tinita-filetree__item--selected { }
```

### CSS Variables for Customization

All components MUST use CSS variables:

```css
:root {
  --tinita-componentname-bg: #ffffff;
  --tinita-componentname-text: #000000;
  --tinita-componentname-border: #e0e0e0;
  --tinita-componentname-hover: #f5f5f5;
}

.tinita-componentname {
  background-color: var(--tinita-componentname-bg);
  color: var(--tinita-componentname-text);
  /* ... */
}
```

### Component Implementation Pattern

```typescript
// ComponentName.tsx
import { useEffect } from 'react';
import { autoInjectStyles } from '../../utils/autoInjectStyles';

export interface ComponentNameProps {
  // ... props
  /**
   * Automatically inject CSS styles.
   * Set to false if you're manually importing CSS.
   * @default true
   */
  autoInjectStyles?: boolean;
}

// Import CSS as string for auto-injection
const CSS_CONTENT = `/* Will be injected by bundler */`;

export function ComponentName({
  autoInjectStyles: shouldAutoInject = true,
  ...props
}: ComponentNameProps) {
  useEffect(() => {
    if (shouldAutoInject && CSS_CONTENT) {
      autoInjectStyles('tinita-componentname-styles', CSS_CONTENT);
    }
  }, [shouldAutoInject]);

  return (
    <div className="tinita-componentname">
      {/* Component implementation */}
    </div>
  );
}
```

### Usage Modes

**Mode 1: Manual Import (Recommended for Production)**

```typescript
// app.tsx or _app.tsx
import 'tinita-react/styles.css'; // All components
// or
import 'tinita-react/ui/FileTree/FileTree.css'; // Specific component

// Then use component
import { FileTree } from 'tinita-react/ui';
<FileTree data={data} autoInjectStyles={false} />
```

**Mode 2: Auto-Inject (Development/Prototyping)**

```typescript
import { FileTree } from 'tinita-react/ui';
<FileTree data={data} /> // autoInjectStyles defaults to true
```

### Build Process

CSS build is automatic when running `pnpm build`:

```bash
pnpm build:js   # Build JavaScript/TypeScript
pnpm build:css  # Build CSS files
pnpm build      # Build both
```

CSS files are:
1. Copied from `src/` to `dist/` maintaining structure
2. Bundled into `dist/styles.css` (all components)
3. Exported via `package.json`:

```json
{
  "exports": {
    "./styles.css": "./dist/styles.css",
    "./ui/ComponentName/ComponentName.css": "./dist/ui/ComponentName/ComponentName.css"
  }
}
```

### SSR Compatibility Requirements

**CRITICAL:** All CSS handling MUST be SSR-safe:

```typescript
// ✅ GOOD - Check for browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Inject styles
}

// ❌ BAD - Assumes browser environment
document.head.appendChild(styleTag);
```

The `autoInjectStyles` utility handles this automatically.

### Edge Cases to Handle

1. **SSR (Next.js, Remix)** - Check for `window` before DOM manipulation
2. **No-JS mode** - CSS must work without JavaScript
3. **Old bundlers** - Separate CSS files work everywhere
4. **Hot reload** - Prevent style duplication on HMR
5. **Multiple instances** - Use unique style IDs

### CSS Best Practices

**✅ DO:**
- Use CSS variables for all customizable values
- Prefix all classes with `tinita-{component}`
- Follow BEM-like naming convention
- Test in SSR environments
- Provide manual import option
- Keep CSS separate from JS bundles
- Document all CSS variables

**❌ DON'T:**
- Bundle CSS with JavaScript
- Use CSS-in-JS for library components
- Use inline styles (prefer classes)
- Assume browser-only environment
- Forget to test without JavaScript
- Use unprefixed class names

### Complete Example

See `packages/tinita-react/CSS_GUIDE.md` for comprehensive examples including:
- Dark mode theming
- Custom styling
- SSR setup
- All usage patterns

### What the Export Generator Does

The export generator (`generate-package-exports.mjs`) automatically handles:
- Detecting single-file utilities (hooks) vs folder-based components (ui)
- Adding to `tsup.config.ts` entry array
- Creating subpath exports in `package.json`
- Updating barrel exports
- Adding `external: ['react', 'react-dom']` for React packages

**IMPORTANT for `tinita-react`:**

The export generator is primarily designed for `tinita` (core package). For `tinita-react`, you need to **manually update** `package.json` exports and `tsup.config.ts` due to the special structure:

1. Manual exports for `./hooks` and `./ui` category imports
2. Manual entries for `src/hooks/index.ts` and `src/ui/index.ts`
3. Keep `src/index.ts` empty (no barrel export)

See the workflow sections above for detailed steps.

## Package Requirements

Every package MUST contain:
1. `package.json` with proper exports
2. `src/index.ts`
3. `tsup.config.ts`
4. `README.md` with usage, API docs, and import examples
5. Build script
6. Lint script
7. Test script

## Workspace Dependencies

Use workspace protocol for internal dependencies:
```json
{
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*"
  }
}
```

## Publishing

- Packages published as `tinita`, `tinita-react`, etc. (not scoped under `@`)
- Each package is independently publishable
- Use `prepublishOnly` script to ensure build before publish
- Version management: manual via `scripts/update-package-versions.mjs`

## Important Project Files

- **ARCHITECTURE.md**: Comprehensive architectural principles and compliance rules
- **CONTRIBUTING.md**: Detailed contribution guidelines
- **pnpm-workspace.yaml**: Workspace configuration (`packages/*`)
- **turbo.json**: Turborepo task pipeline configuration
- **scripts/generate-package-exports.mjs**: Automated export generation script
