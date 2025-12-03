# Project Overview & Product Development Requirements (PDR)

**Project Name**: Tinita
**Version**: 0.0.1
**Last Updated**: 2025-12-03
**Status**: Early Development
**Repository**: https://github.com/dunggramer/tinita

## Executive Summary

Tinita is a modern TypeScript utility library ecosystem designed to provide framework-agnostic utilities, React hooks, Vue composables, and shared tooling with an emphasis on tree-shakeability, zero dependencies, and exceptional developer experience. Built as a Turborepo monorepo, Tinita challenges the "Moment-syndrome" by ensuring users only ship what they import through strict architectural patterns and per-file builds.

## Project Purpose

### Vision
Create a comprehensive, modular utility library ecosystem that serves developers across multiple frameworks and environments while maintaining optimal bundle sizes and developer productivity.

### Mission
Provide production-ready utility packages that:
- Maximize tree-shakeability through one-file-one-function architecture
- Eliminate runtime bloat with zero external dependencies
- Support multiple frameworks without bundling conflicts
- Maintain strict TypeScript type safety
- Deliver consistent developer experience across all packages

### Value Proposition
- **Zero Bundle Bloat**: Import one function, ship one function - guaranteed tree-shaking
- **Framework Agnostic Core**: Use the same utilities across React, Vue, Node.js, and vanilla JS
- **Type-Safe by Default**: Full TypeScript support with strict mode and comprehensive type guards
- **Independent Packages**: Each package publishes independently with semantic versioning
- **Developer Productivity**: Automated export generation, consistent patterns, comprehensive docs

## Target Users

### Primary Users
1. **Frontend Developers**: Building React or Vue applications
2. **Full-Stack Developers**: Needing utilities across client and server
3. **Library Authors**: Building on top of Tinita utilities
4. **Enterprise Teams**: Standardizing utility usage across projects
5. **Open Source Maintainers**: Reducing dependency footprint

### User Personas

**Persona 1: React Developer**
- **Needs**: Tree-shakeable hooks, UI components, minimal bundle impact
- **Pain Points**: Bloated dependencies, poor tree-shaking, framework coupling
- **Solution**: `tinita-react` with per-hook imports, no React bundling, SSR compatibility

**Persona 2: Library Author**
- **Needs**: Zero-dependency utilities, predictable behavior, small footprint
- **Pain Points**: Dependency conflicts, version drift, bundle size
- **Solution**: `tinita` core with subpath exports, semantic versioning, isolated modules

**Persona 3: Enterprise Developer**
- **Needs**: Consistent patterns, maintainable code, comprehensive documentation
- **Pain Points**: Inconsistent utility usage, lack of standards, poor discoverability
- **Solution**: Standardized exports, clear documentation, TypeScript-first design

## Key Features & Capabilities

### 1. Monorepo Architecture

**Structure**:
- **`tinita`**: Framework-agnostic core utilities (file, string, number, UUID, etc.)
- **`tinita-react`**: React hooks and UI components with auto-inject CSS
- **`tinita-vue`**: Vue 3 composables (planned)
- **`tinita-node`**: Node.js-specific utilities (planned)
- **`config/*`**: Shared ESLint, TypeScript, and Prettier configurations

**Build System**:
- Turborepo for task orchestration
- tsup for fast, zero-config TypeScript bundling
- Per-file builds with `bundle: false` for tree-shaking
- Automated export generation via scripts

### 2. Tree-Shaking First Design

**Architectural Principle**: One File = One Function

**Implementation**:
- Each utility exists in its own file
- `tsup` builds each file separately (no bundling)
- Explicit subpath exports in `package.json`
- Barrel exports for convenience, subpath exports for optimization

**Example**:
```typescript
// Both work, but subpath import guarantees minimal bundle
import { fileSize } from 'tinita';  // Barrel import
import { fileSize } from 'tinita/file/fileSize';  // Subpath import (optimal)
```

### 3. Framework Isolation

**Strict Boundaries**:
- Core `tinita` has zero framework dependencies
- React code only in `tinita-react` (peerDependencies)
- Vue code only in `tinita-vue` (peerDependencies)
- Framework packages externalize their dependencies (never bundle React/Vue)

### 4. CSS Architecture for UI Components

**Plug-and-Play CSS Approach**:
- **Manual Import** (production): `import 'tinita-react/styles.css'`
- **Auto-Inject** (development): Component-level style injection via `autoInjectStyles`
- **SSR Compatible**: Safe checks for browser environment
- **Customizable**: CSS variables for theming
- **Prefixed Classes**: `tinita-{component}` naming convention

**Build Process**:
- CSS files copied to `dist/` maintaining structure
- All styles bundled into `dist/styles.css`
- Individual component CSS available as subpath exports

### 5. Automated Export Generation

**Script**: `scripts/generate-package-exports.mjs`

**Capabilities**:
- Scans `src/` directory for all `.ts` and `.tsx` files
- Generates `package.json` exports field
- Updates `tsup.config.ts` entry array
- Creates barrel exports in `src/index.ts`
- Handles both single-file utilities and folder-based components

**Workflow Integration**:
- Runs automatically before build in Turborepo pipeline
- Triggered by `generate:exports` task

### 6. Component Colocation Pattern

**UI Component Structure** (`tinita-react/src/ui/`):
```
ComponentName/
├── ComponentName.tsx       # Main component (required)
├── ComponentName.css       # Styles (optional)
├── SubComponent.tsx        # Private components (optional)
├── types.ts                # Type definitions (optional)
├── utils/                  # Component utilities (optional)
└── index.tsx               # Re-exports only (required)
```

**Rationale**:
- **Discoverability**: Easy to find main component file
- **Maintainability**: Clear separation between logic and exports
- **Scalability**: Room for growth without index.tsx clutter
- **Industry Standard**: Follows "1 file = 1 unit" convention

## Technical Requirements

### Functional Requirements

**FR1: Package Independence**
- Each package must build and publish independently
- No runtime dependencies between Tinita packages
- Core utilities must work in all JavaScript environments

**FR2: Tree-Shaking Guarantee**
- One file = one function/hook/composable
- Per-file builds with `bundle: false`
- Subpath exports for every utility
- No side effects in module initialization

**FR3: TypeScript Excellence**
- All code written in TypeScript with `strict: true`
- Type guards return `value is Type` for narrowing
- Comprehensive `.d.ts` generation
- No `any` types except when absolutely necessary

**FR4: CSS Handling**
- Manual import option for production builds
- Auto-inject option for development/prototyping
- SSR compatibility (browser environment checks)
- CSS variables for customization
- No CSS-in-JS for library components

**FR5: Build Automation**
- Automated export generation before builds
- Turborepo task dependencies
- Clean builds (rimraf before build)
- Separate CSS and JS build tasks

**FR6: Testing Coverage**
- Vitest for all testing
- Unit tests for all utilities/hooks
- Component tests for UI components
- Integration tests for complex interactions

### Non-Functional Requirements

**NFR1: Performance**
- Minimal bundle size impact (<1KB per utility)
- Fast build times via tsup
- Efficient tree-shaking through module design
- Lazy loading where appropriate

**NFR2: Developer Experience**
- Clear, comprehensive documentation
- Consistent API patterns across utilities
- Helpful TypeScript IntelliSense
- Quick start under 5 minutes

**NFR3: Maintainability**
- File size limit of 500 lines
- DRY, KISS, YAGNI principles
- Clear naming conventions
- Comprehensive inline documentation

**NFR4: Compatibility**
- Node.js >= 18.0.0
- React >= 18.0.0 (`tinita-react`)
- Vue >= 3.0.0 (`tinita-vue`, planned)
- All modern browsers and edge runtimes

**NFR5: Security**
- No hardcoded secrets
- Input validation in utilities
- Secure defaults
- Regular dependency audits

## Success Metrics

### Adoption Metrics
- NPM downloads per package
- GitHub stars and forks
- Community engagement (issues, PRs, discussions)
- Package dependents

### Performance Metrics
- Average bundle size per import: < 1KB
- Tree-shaking effectiveness: 100% (only imported code included)
- Build time per package: < 10 seconds
- Test execution time: < 5 seconds per package

### Quality Metrics
- Test coverage: > 80%
- Type coverage: 100%
- Zero TypeScript errors with `strict: true`
- Zero ESLint warnings

### Developer Experience Metrics
- Time to first import: < 2 minutes
- Documentation completeness: 100% coverage
- API consistency score: 100%
- Issue response time: < 48 hours

## Technical Architecture

### Core Components

**1. Build System**
- **Turborepo**: Monorepo task orchestration
- **tsup**: TypeScript bundling with per-file builds
- **pnpm**: Package management and workspaces
- **Vitest**: Testing framework

**2. Package Structure**
- **Main Packages** (`packages/*`): Publishable utilities and hooks
- **Config Packages** (`config/*`): Shared configurations
- **Scripts** (`scripts/*`): Build automation and publishing tools

**3. Export System**
- **Barrel Exports**: Convenience imports from main entry
- **Subpath Exports**: Optimal tree-shaking via direct paths
- **Automated Generation**: Script-based export management

**4. CSS System** (tinita-react)
- **Build Script**: `scripts/build-css.mjs` copies and bundles CSS
- **Auto-Inject Utility**: `utils/autoInjectStyles.ts` for development
- **Manual Imports**: Production-ready CSS files in `dist/`

### Technology Stack

**Runtime**:
- TypeScript 5.9.2
- Node.js >= 18.0.0

**Build Tools**:
- Turborepo 2.6.1
- tsup 8.5.1
- pnpm 9.0.0

**Code Quality**:
- ESLint 9.39.1
- Prettier 3.6.2
- TypeScript ESLint 8.48.0

**Testing**:
- Vitest 4.0.14
- Testing Library (React)

**Frameworks** (peerDependencies):
- React >= 18.0.0
- Vue >= 3.0.0 (planned)

## Use Cases

### UC1: Import Utility Function
**Actor**: Frontend Developer
**Goal**: Use file size formatting utility
**Flow**:
1. Install package: `pnpm add tinita`
2. Import utility: `import { fileSize } from 'tinita/file/fileSize'`
3. Use in code: `fileSize(1024)  // "1.02 KB"`

**Outcome**: Minimal bundle impact, type-safe utility usage

### UC2: Use React Hook
**Actor**: React Developer
**Goal**: Add toggle state management
**Flow**:
1. Install: `pnpm add tinita-react react`
2. Import hook: `import { useToggle } from 'tinita-react/hooks'`
3. Use in component: `const [isOpen, toggle] = useToggle(false)`

**Outcome**: Clean hook usage with tree-shaking

### UC3: Add UI Component
**Actor**: React Developer
**Goal**: Display file tree component
**Flow**:
1. Install: `pnpm add tinita-react`
2. Import styles (once): `import 'tinita-react/styles.css'`
3. Import component: `import { FileTree } from 'tinita-react/ui'`
4. Use component: `<FileTree data={fileData} />`

**Outcome**: Working UI component with styles

### UC4: Contribute New Utility
**Actor**: Open Source Contributor
**Goal**: Add new string utility
**Flow**:
1. Clone repository
2. Create `packages/tinita/src/string/isEmpty.ts`
3. Run `pnpm run generate:exports`
4. Write tests in `packages/tinita/tests/string.test.ts`
5. Run `pnpm build && pnpm test`
6. Submit PR

**Outcome**: New utility added with automated exports

### UC5: Create New Package
**Actor**: Maintainer
**Goal**: Add Node.js utilities package
**Flow**:
1. Create `packages/tinita-node/`
2. Set up `package.json` with exports
3. Create `tsup.config.ts` with `bundle: false`
4. Add to `pnpm-workspace.yaml`
5. Create utilities following one-file-one-function pattern
6. Write tests and documentation
7. Add to Turborepo pipeline

**Outcome**: New independent package ready for publishing

## Constraints & Limitations

### Technical Constraints
- Node.js >= 18.0.0 required for native test runner
- Framework packages require peer dependencies
- One file = one function/hook (no multi-export files)
- ESM and CJS formats required for compatibility

### Operational Constraints
- Package naming: `tinita` (not `@tinita/`)
- Must run `generate:exports` before building
- Turborepo required for monorepo orchestration
- Manual export updates for `tinita-react` UI components

### Design Constraints
- File size limit: 500 lines
- No external runtime dependencies in core package
- CSS must be separate from JavaScript bundles
- Framework dependencies must be peer dependencies

## Risks & Mitigation

### Risk 1: Export Generation Failures
**Impact**: Medium
**Likelihood**: Low
**Mitigation**: Comprehensive testing of generation script, clear error messages, manual fallback documentation

### Risk 2: Tree-Shaking Ineffective
**Impact**: High
**Likelihood**: Low
**Mitigation**: Automated testing of bundle sizes, `bundle: false` enforcement, subpath export validation

### Risk 3: CSS Injection Issues (SSR)
**Impact**: Medium
**Likelihood**: Medium
**Mitigation**: Browser environment checks, manual import documentation, SSR testing

### Risk 4: Version Drift Between Packages
**Impact**: Medium
**Likelihood**: Medium
**Mitigation**: Semantic versioning, independent package publishing, clear dependency management

### Risk 5: Breaking Changes in Dependencies
**Impact**: Medium
**Likelihood**: Medium
**Mitigation**: Lock files, peer dependency ranges, comprehensive testing

## Future Roadmap

### Phase 1: Foundation (v0.0.x - Current)
- ✅ Monorepo setup with Turborepo
- ✅ Core utilities package (`tinita`)
- ✅ React package (`tinita-react`) with hooks and UI components
- ✅ Automated export generation
- ✅ CSS handling for UI components
- ✅ Build and test infrastructure

### Phase 2: Expansion (v0.1.x - Next)
- 📋 Vue composables package (`tinita-vue`)
- 📋 Node.js utilities package (`tinita-node`)
- 📋 Expand core utilities (date, array, object helpers)
- 📋 More React hooks (useDebounce, useLocalStorage, etc.)
- 📋 Additional UI components (Button, Input, Modal, etc.)
- 📋 Storybook integration for component documentation

### Phase 3: Maturity (v1.0.x - Planned)
- 📋 Comprehensive documentation site
- 📋 Interactive examples and playground
- 📋 Migration guides for major versions
- 📋 Performance benchmarks
- 📋 Accessibility compliance for UI components
- 📋 Internationalization support

### Phase 4: Ecosystem (v2.0.x - Future)
- 📋 Plugin system for extensions
- 📋 CLI for scaffolding
- 📋 Code generation tools
- 📋 Design system integration
- 📋 Advanced theming capabilities

## Dependencies & Integration

### Required Dependencies (Development)
- Turborepo 2.6.1
- tsup 8.5.1
- TypeScript 5.9.2
- Vitest 4.0.14
- ESLint 9.39.1
- Prettier 3.6.2

### Peer Dependencies (Per Package)
- React >= 18.0.0 (`tinita-react`)
- Vue >= 3.0.0 (`tinita-vue`, planned)

### Zero Runtime Dependencies
- `tinita` has zero runtime dependencies
- Framework packages only have framework peer dependencies
- Build tools are dev dependencies only

## Compliance & Standards

### Coding Standards
- **File Size**: Maximum 500 lines per file
- **Naming**: camelCase for functions, PascalCase for components
- **TypeScript**: Strict mode enabled, no `any` types
- **Testing**: Vitest with > 80% coverage
- **Documentation**: JSDoc comments for public APIs

### Package Standards
- **Versioning**: Semantic versioning (SemVer)
- **Exports**: Subpath exports for all utilities
- **Build**: ESM + CJS dual format
- **Types**: Full `.d.ts` type definitions
- **Publishing**: NPM with provenance

### Monorepo Standards
- **Workspaces**: pnpm workspaces
- **Task Dependencies**: Turborepo pipeline
- **Shared Config**: Centralized in `config/*`
- **Scripts**: Consistent across all packages

## Glossary

- **Tree-Shaking**: Build optimization that removes unused code from final bundle
- **Subpath Export**: Package.json exports that allow direct imports (e.g., `pkg/utils/fn`)
- **Barrel Export**: Index file that re-exports multiple modules
- **Monorepo**: Single repository containing multiple packages
- **Peer Dependency**: Dependency expected to be provided by consuming application
- **Component Colocation**: Organizing all component-related files in a single directory

## Appendix

### Related Documentation
- [Codebase Summary](./codebase-summary.md)
- [Code Standards](./code-standards.md)
- [System Architecture](./system-architecture.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
- [CLAUDE.md](../CLAUDE.md)

### External Resources
- [Turborepo Documentation](https://turborepo.com/)
- [tsup Documentation](https://tsup.egoist.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Package Exports](https://nodejs.org/api/packages.html#exports)

### Package Links
- GitHub: https://github.com/dunggramer/tinita
- NPM (tinita): https://www.npmjs.com/package/tinita
- NPM (tinita-react): https://www.npmjs.com/package/tinita-react

## Unresolved Questions

1. **Vue Package Timeline**: When should `tinita-vue` development begin?
2. **Node Package Scope**: What Node.js-specific utilities are highest priority?
3. **Documentation Site**: Should we use VitePress, Docusaurus, or custom solution?
4. **Monorepo Scaling**: How to handle >10 packages in the monorepo?
5. **Breaking Changes**: What versioning strategy for coordinated breaking changes across packages?
