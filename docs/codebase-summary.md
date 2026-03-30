# Codebase Summary

**Last Updated**: 2026-03-30
**Version**: 0.0.1 (tinita), 0.0.2-alpha.1 (tinita-react)
**Repository**: [dunggramer/tinita](https://github.com/dunggramer/tinita)
**Status**: Active development with CSS animations and carousel component

## Overview

Tinita is a multi-package monorepo providing tree-shakeable TypeScript utilities, React hooks/components, Vue composables (planned), and shared tooling. The project emphasizes zero dependencies, optimal bundle sizes, and exceptional developer experience through strict architectural patterns.

## Project Structure

```
tinita/
├── .claude/                   # Claude Code configuration and skills
├── config/                    # Shared configurations
│   ├── eslint-config/        # ESLint presets
│   ├── typescript-config/    # TypeScript configurations
│   └── ui/                   # Shared React components
├── packages/                  # Publishable packages
│   ├── tinita/               # Core utilities (framework-agnostic)
│   └── tinita-react/         # React hooks and UI components
├── scripts/                   # Build and publishing automation
├── docs/                      # Project documentation
├── package.json              # Root workspace configuration
├── pnpm-workspace.yaml       # pnpm workspace definition
└── turbo.json                # Turborepo task configuration
```

## Core Packages

### 1. tinita (Core Utilities)

**Location**: `packages/tinita/`
**Version**: 0.0.1
**Description**: Framework-agnostic TypeScript utilities with zero dependencies

**Directory Structure**:
```
packages/tinita/
├── src/
│   ├── file/                 # File utilities
│   │   ├── fileSize.ts       # Human-readable file size formatting
│   │   ├── getFileNameParts.ts  # Parse file names into components
│   │   └── truncateFileName.ts  # Truncate long file names
│   ├── uuid/                 # UUID generation
│   │   └── generateUUID.ts   # Cross-platform UUID v4 generator
│   └── index.ts              # Barrel exports
├── dist/                     # Build output (ESM + CJS)
├── tests/                    # Vitest test suites
├── package.json              # Package configuration with subpath exports
└── tsup.config.ts            # Build configuration
```

**Key Utilities**:
- **File Operations** (3 utilities)
  - `fileSize(size, base)` - Convert bytes to human-readable format
  - `getFileNameParts(fileName)` - Extract name and extension
  - `truncateFileName(fileName, maxLength)` - Shorten file names

- **UUID Generation** (1 utility)
  - `generateUUID()` - Cross-platform UUID v4 with automatic fallbacks

**Build Configuration**:
```typescript
// tsup.config.ts
{
  entry: [
    'src/index.ts',
    'src/file/fileSize.ts',
    'src/file/getFileNameParts.ts',
    'src/file/truncateFileName.ts',
    'src/uuid/generateUUID.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  bundle: false,  // Critical for tree-shaking
}
```

**Package Exports**:
```json
{
  ".": "./dist/index.{mjs,cjs}",
  "./file/fileSize": "./dist/file/fileSize.{mjs,cjs}",
  "./file/getFileNameParts": "./dist/file/getFileNameParts.{mjs,cjs}",
  "./file/truncateFileName": "./dist/file/truncateFileName.{mjs,cjs}",
  "./uuid/generateUUID": "./dist/uuid/generateUUID.{mjs,cjs}"
}
```

### 2. tinita-react (React Ecosystem)

**Location**: `packages/tinita-react/`
**Version**: 0.0.2-alpha.1
**Description**: React hooks and UI components with Tailwind CSS v4 and animations

**Directory Structure**:
```
packages/tinita-react/
├── src/
│   ├── hooks/                # React hooks (single-file)
│   │   ├── index.ts          # Hooks barrel export
│   │   ├── useToggle.ts      # Boolean toggle with controls
│   │   └── useIsomorphicLayoutEffect.ts  # SSR-safe layout effect
│   ├── ui/                   # UI components (folder-based)
│   │   ├── index.ts          # UI barrel export
│   │   ├── file-tree/        # File tree component
│   │   │   ├── FileTree.tsx  # Main component
│   │   │   ├── FileTree.css  # Component styles
│   │   │   ├── components/   # Private subcomponents
│   │   │   ├── utils/        # Parser + icon utilities
│   │   │   ├── types.ts      # Type definitions
│   │   │   └── index.ts      # Re-exports
│   │   ├── ping/             # Ping indicator component
│   │   │   ├── Ping.tsx
│   │   │   └── index.ts
│   │   └── carousel-ticker/  # Infinite scroll component
│   │       ├── CarouselTicker.tsx
│   │       ├── CarouselTicker.css
│   │       ├── CarouselTicker.types.ts
│   │       ├── CarouselTicker.utils.ts
│   │       └── index.ts
│   ├── utils/                # Shared utilities
│   │   ├── autoInjectStyles.ts  # SSR-safe CSS injection
│   │   └── cn.ts            # clsx + tailwindMerge
│   ├── styles/               # Global styles
│   │   ├── globals.css      # Base styles + color tokens
│   │   ├── animations.css   # 18+ keyframe animations
│   │   └── tailwind.css     # Tailwind v4 configuration
│   └── index.ts              # Empty (no barrel export)
├── dist/                     # Build output
├── scripts/
│   └── build-css.mjs         # CSS build script
├── .storybook/               # Storybook configuration
├── tests/                    # Component tests
├── package.json              # Package with CSS exports
├── tsup.config.ts            # Build config with React external
├── tailwind.config.ts        # Tailwind v4 configuration
└── vitest.config.ts          # Test configuration
```

**Hooks** (2):
- `useToggle(initialValue)` - Boolean state with setValue/setTrue/setFalse controls
- `useIsomorphicLayoutEffect` - SSR-safe layout effect hook (not re-exported from hooks/index.ts yet)

**UI Components** (3):
- `FileTree` - Tree view with 18+ file icons, dark/light themes, Radix accordion, ARIA accessible
- `Ping` - Loading indicator with CSS animation
- `CarouselTicker` - Infinite scroll ticker with ResizeObserver, IntersectionObserver, pausable on hover

**Build Configuration**:
```typescript
// tsup.config.ts
{
  entry: [
    'src/index.ts',
    'src/hooks/useToggle.ts',
    'src/ui/FileTree/index.tsx',
    'src/ui/ping/index.ts',
    'src/utils/autoInjectStyles.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  bundle: false,
  external: ['react', 'react-dom'],  // Never bundle frameworks
}
```

**CSS Architecture**:
- **Tailwind v4**: Build-time compilation to pure CSS (no runtime dependency)
- **globals.css**: 128 lines, 11 color tokens, dark theme support
- **animations.css**: 558 lines, 18+ keyframes, spring physics, configurable durations/easing
- **Component CSS**: BEM naming with tinita- prefix, 60+ CSS variables for customization
- **Build Process**: CSS files copied to dist/, bundled into dist/styles.css

**Package Exports** (Sample):
```json
{
  "./hooks/useToggle": "./dist/hooks/useToggle.{mjs,cjs}",
  "./ui/file-tree": "./dist/ui/file-tree/index.{mjs,cjs}",
  "./ui/ping": "./dist/ui/ping/index.{mjs,cjs}",
  "./ui/carousel-ticker": "./dist/ui/carousel-ticker/index.{mjs,cjs}",
  "./styles.css": "./dist/styles.css",
  "./styles/globals.css": "./dist/styles/globals.css",
  "./styles/animations.css": "./dist/styles/animations.css"
}
```

**Dependencies**:
- **Peer Dependencies**: React >= 18.0.0 (not bundled)
- **Runtime Dependencies**:
  - `@radix-ui/react-accordion` ^1.2.12
  - `lucide-react` ^0.555.0
  - `motion` ^12.23.25
  - `clsx` (class merging)
  - `tailwind-merge` (utility conflict resolution)

## Configuration Packages

### 1. eslint-config

**Location**: `config/eslint-config/`
**Purpose**: Shared ESLint configurations for consistent code quality

**Presets**:
- `base.js` - Base ESLint rules for JavaScript/TypeScript
- `next.js` - Next.js-specific rules
- `react-internal.js` - React component linting rules

### 2. typescript-config

**Location**: `config/typescript-config/`
**Purpose**: Shared TypeScript compiler configurations

**Presets**:
- `base.json` - Base TypeScript config with strict mode
- `nextjs.json` - Next.js project configuration
- `react-library.json` - React library configuration
- `vue-library.json` - Vue library configuration (planned)

**Base Configuration Highlights**:
```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "NodeNext",
    "declaration": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 3. ui

**Location**: `config/ui/`
**Purpose**: Shared internal React components for development

**Components**:
- `button.tsx` - Reusable button component
- `card.tsx` - Card container component
- `code.tsx` - Code display component

## Build & Automation Scripts

### Scripts Overview

**generate-package-exports.mjs** (Deprecated):
- Previously automated export generation
- Removed in favor of manual control
- Manual updates now required for exports and tsup entries

### 2. publish.mjs

**Location**: `scripts/publish.mjs`
**Purpose**: Automated package publishing to NPM

**Features**:
- Single package or all packages publishing
- Dry-run mode for testing
- Automatic build before publish
- NPM provenance support

**Usage**:
```bash
pnpm publish:tinita         # Publish tinita package
pnpm publish:tinita-react   # Publish tinita-react package
pnpm publish:all            # Publish all packages
pnpm publish:dry-run        # Test publishing
```

### 3. update-package-versions.mjs

**Location**: `scripts/update-package-versions.mjs`
**Purpose**: Synchronize package versions across the monorepo

## Turborepo Configuration

**File**: `turbo.json`

**Task Pipeline**:
```json
{
  "tasks": {
    "generate:exports": {
      "inputs": ["src/**/*.ts", "src/**/*.tsx"],
      "outputs": ["package.json", "tsup.config.ts", "src/index.ts"],
      "cache": true
    },
    "build": {
      "dependsOn": ["^build", "generate:exports"],
      "outputs": ["dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "check-types": {
      "dependsOn": ["^check-types"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Key Points**:
- Build depends on `^build` only (generate:exports removed)
- Test depends on build
- Caching enabled for reproducible builds
- Parallel execution of independent tasks
- Dev mode runs in persistent watch mode

## Development Technologies

### Runtime & Package Management
- **Node.js**: >= 18.0.0 (engines requirement)
- **pnpm**: 9.0.0 (package manager)
- **Workspace**: pnpm workspaces for monorepo

### Build Tools
- **Turborepo**: 2.6.1 - Monorepo build orchestration
- **tsup**: 8.5.1 - TypeScript bundler (esbuild-based)
- **TypeScript**: 5.9.2 - Type-safe JavaScript
- **rimraf**: 6.1.2 - Cross-platform file deletion

### Code Quality
- **ESLint**: 9.39.1 - Linting and code standards
- **Prettier**: 3.6.2 - Code formatting
- **TypeScript ESLint**: 8.48.0 - TypeScript-specific linting

### Testing
- **Vitest**: 4.0.14 - Fast unit testing framework
- **@testing-library/react**: 16.3.0 - React component testing
- **jsdom**: 27.2.0 - DOM implementation for tests

### React Ecosystem (tinita-react)
- **Storybook**: 10.1.2 - Component documentation
- **Tailwind CSS**: 4.1.17 - Utility-first CSS framework
- **PostCSS**: 8.5.6 - CSS processing
- **Radix UI**: Components for accessible UI primitives
- **Lucide React**: Icon library
- **Motion**: Animation library

## File Size Compliance

All source files comply with the 500-line limit:

**Largest Files**:
1. FileTree.tsx (~250 lines) - Main component implementation
2. FileTree.stories.tsx (~150 lines) - Storybook documentation
3. generate-package-exports.mjs (~200 lines) - Export generator
4. publish.mjs (~180 lines) - Publishing automation

**Compliance Status**: ✅ All files under 500 lines

## Testing Infrastructure

**Test Framework**: Vitest with jsdom

**Test Location**:
- Package-level tests: `packages/<package>/tests/`
- Root-level config: `vitest.config.ts`

**Test Coverage Goals**:
- Unit tests for all utilities: > 80% coverage
- Component tests for UI elements
- Integration tests for complex workflows

**Current Status**:
- `tinita`: Test infrastructure ready
- `tinita-react`: Test infrastructure ready with React Testing Library

## Build Output Structure

### tinita Package

```
dist/
├── index.{mjs,cjs,d.ts}      # Main entry point
├── file/
│   ├── fileSize.{mjs,cjs,d.ts}
│   ├── getFileNameParts.{mjs,cjs,d.ts}
│   └── truncateFileName.{mjs,cjs,d.ts}
└── uuid/
    └── generateUUID.{mjs,cjs,d.ts}
```

### tinita-react Package

```
dist/
├── index.{mjs,cjs,d.ts}      # Empty entry
├── hooks/
│   └── useToggle.{mjs,cjs,d.ts}
├── ui/
│   ├── FileTree/
│   │   ├── index.{mjs,cjs,d.ts}
│   │   └── FileTree.css
│   └── ping/
│       └── index.{mjs,cjs,d.ts}
├── utils/
│   └── autoInjectStyles.{mjs,cjs,d.ts}
├── styles.css                # All component styles
└── tailwind.css              # Tailwind utilities
```

## Documentation Files

### Root Documentation
- **README.md** (162 lines) - Project overview
- **ARCHITECTURE.md** (643 lines) - Architectural principles and compliance
- **CONTRIBUTING.md** (422 lines) - Contribution guidelines
- **CLAUDE.md** (562 lines) - Claude Code specific instructions
- **LICENSE** - MIT license

### Supporting Documentation
- **BUILD_CLEAN.md** - Clean build practices
- **CI_CD.md** - CI/CD setup and workflows
- **DOCUMENT_REQUIRED.md** - Documentation requirements
- **EDGE_CASES.md** - Edge case handling patterns
- **FILES_PUBLISHED.md** - NPM publishing file list
- **PUBLISHING.md** - Publishing process details
- **QUICK_PUBLISH.md** - Quick publishing guide
- **QUICK_START_CI_CD.md** - CI/CD quick start
- **SETUP_SUMMARY.md** - Project setup summary
- **WORKFLOW.md** - Development workflow

### Package Documentation
- **packages/tinita/README.md** (97 lines) - Core utilities documentation
- **packages/tinita-react/README.md** (55 lines) - React package documentation
- **packages/tinita-react/CSS_GUIDE.md** - CSS handling guide
- **packages/tinita-react/src/ui/FileTree/README.md** - FileTree component docs

## Git Configuration

**Files**:
- `.gitignore` - Excludes node_modules, dist, .env, build artifacts
- `.gitattributes` - Line ending normalization
- `.npmignore` - NPM publishing exclusions
- `.npmrc` - NPM configuration

**Key Exclusions**:
```
node_modules/
dist/
*.log
.env
.env.*
.turbo/
coverage/
```

## Key Architectural Patterns

### 1. One File = One Function
Every utility, hook, and composable lives in its own file for optimal tree-shaking.

### 2. Per-File Builds
`tsup` configured with `bundle: false` to preserve module boundaries.

### 3. Subpath Exports
Every utility exposed via explicit subpath in `package.json` exports.

### 4. Framework Externalization
React, Vue, and other frameworks are peer dependencies, never bundled.

### 5. Component Colocation
UI components follow the pattern: MainComponent.tsx + index.tsx re-export.

### 6. CSS Separation
CSS files remain separate from JavaScript bundles, with both manual and auto-inject options.

### 7. Automated Export Management
Script-based generation of exports, tsup entries, and barrel files.

## Development Workflow

### Initial Setup
```bash
git clone https://github.com/dunggramer/tinita
cd tinita
pnpm install
pnpm build
```

### Development
```bash
pnpm dev          # Run all packages in dev mode
pnpm lint         # Lint all packages
pnpm test         # Run all tests
pnpm check-types  # Type check all packages
pnpm format       # Format code with Prettier
```

### Adding New Utility
```bash
# 1. Create utility file
packages/tinita/src/category/utility.ts

# 2. Generate exports
cd packages/tinita && pnpm run generate:exports

# 3. Write tests
packages/tinita/tests/category.test.ts

# 4. Build and test
pnpm build && pnpm test
```

### Publishing
```bash
pnpm publish:dry-run    # Test publishing
pnpm publish:tinita     # Publish specific package
pnpm publish:all        # Publish all packages
```

## Current State Summary

**Packages Ready**:
- ✅ `tinita` (v0.0.1) - 4 utilities (file + uuid)
- ✅ `tinita-react` (v0.0.2-alpha.1) - 2 hooks + 3 UI components

**Recent Additions** (Recent commits):
- ✅ CarouselTicker component (infinite scroll with ResizeObserver)
- ✅ Animation system (18+ keyframes with spring physics)
- ✅ Tailwind v4 build-time CSS compilation
- ✅ useIsomorphicLayoutEffect hook (SSR-safe)

**Infrastructure Complete**:
- ✅ Turborepo monorepo (simplified pipeline)
- ✅ Per-file builds with tree-shaking
- ✅ Tailwind v4 build-time architecture
- ✅ CSS auto-inject + manual import modes
- ✅ Testing infrastructure (Vitest ready)
- ✅ Shared configurations

**Known Issues**:
- useIsomorphicLayoutEffect not exported from hooks/index.ts yet
- build-entry.css nearly empty

## Next Steps

**Immediate**:
1. Export useIsomorphicLayoutEffect from hooks/index.ts
2. Write tests for all utilities and components
3. Set up CI/CD with GitHub Actions
4. Expand core utilities (string, array, object)

**Short-Term**:
5. Add more React hooks (useDebounce, useLocalStorage, etc.)
6. Add more UI components (Button, Input, Modal, etc.)
7. Create comprehensive API documentation
8. Begin tinita-vue package development

**Long-Term**:
9. Reach 100+ utilities across all categories
10. Documentation site (VitePress or similar)
11. Community growth and ecosystem establishment

## Related Documentation

- [Project Overview & PDR](./project-overview-pdr.md)
- [Code Standards](./code-standards.md)
- [System Architecture](./system-architecture.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
