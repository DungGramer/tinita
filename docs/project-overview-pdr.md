# Project Overview & Product Development Requirements (PDR)

**Project Name**: Tinita  
**Current Status**: Alpha (v0.0.1 tinita, v0.0.2-alpha.1 tinita-react)  
**Last Updated**: 2026-09-24 (vòng 2) · commit 0a1dd88  
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

**Current State (v0.0.x)**:
- **`tinita`** (v0.0.1): Framework-agnostic utilities - 4 files (fileSize, getFileNameParts, truncateFileName, generateUUID)
- **`tinita-react`** (v0.0.2-alpha.1): React hooks (2) + UI components (3) + CSS
  - Hooks: useToggle, useIsomorphicLayoutEffect
  - Components: FileTree, Ping, CarouselTicker
  - CSS: Tailwind v4 + CSS variables + prefix `tinita-`
- **`config/*`**: ESLint, TypeScript, UI (shared configs)
- **`apps/storybook`** (private): Storybook 10.1.4 for component documentation

**Build System**:
- Turborepo for task orchestration (7 tasks)
- tsup for TypeScript bundling:
  - tinita: `bundle: false` (tree-shaking)
  - tinita-react: `bundle: true` (external react deps)
- PostCSS + Tailwind v4 for CSS build (6-step pipeline)
- Manual exports maintenance in package.json

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

### 5. Export Management

**Current Approach**:
- Exports trong `package.json` được maintain **thủ công** cho mỗi package
- tsup tự khám phá entry files bằng glob pattern trong `tsup.config.ts`
- tinita: entry = `src/index.ts` + glob `src/*/**/*.ts`
- tinita-react: entry = 9 files (hooks, ui, utils)

**Known Issue**:
- Root script `generate:exports` không tồn tại - là hỏng cần gỡ (legacy)

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
- **Manual Management**: Exports in `package.json` maintained manually; tsup entries auto-discovered via glob

**4. CSS System** (tinita-react)
- **Build Script**: `packages/tinita-react/scripts/build-css.mjs` copies and bundles CSS
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
2. Import hook: `import { useToggle } from 'tinita-react/hooks/useToggle'`
3. Use in component: `const [isOpen, toggle] = useToggle(false)`

**Outcome**: Type-safe hook with minimal bundle impact

### UC3: Add UI Component
**Actor**: React Developer
**Goal**: Display file tree component
**Flow**:
1. Install: `pnpm add tinita-react`
2. Import styles (once): `import 'tinita-react/styles.css'`
3. Import component: `import { FileTree } from 'tinita-react/ui/file-tree'`
4. Use component: `<FileTree data={fileData} />`

**Outcome**: Working UI component with CSS + Tailwind theming

### UC4: Contribute New Utility
**Actor**: Open Source Contributor
**Goal**: Add new string utility
**Flow**:
1. Clone repository
2. Create `packages/tinita/src/string/isEmpty.ts`
3. Add to `tsup.config.ts` entry (or relies on glob auto-discovery)
4. Add export to `package.json` exports field manually
5. Write tests in `packages/tinita/tests/`
6. Run `pnpm build && pnpm test`
7. Submit PR

**Outcome**: New utility added, tree-shakeable via subpath export

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
- Turborepo required for monorepo orchestration
- Manual export updates in `package.json` when adding new utilities/components
- Manual export updates for `tinita-react` UI components (subpath exports)

### Design Constraints
- File size limit: 500 lines
- No external runtime dependencies in core package
- CSS must be separate from JavaScript bundles
- Framework dependencies must be peer dependencies

### Ràng Buộc Bắt Buộc Từ Owner (2026-09-24)

Hai ràng buộc dưới đây là **điều kiện cứng** cho mọi quyết định kiến trúc về sau, không phải
"nice to have".

**RB-1: Cài lẻ theo component.** Component sẽ dùng dependency **không đồng nhất** - có component
dùng `motion`, có component không; có component dùng `antd`, có component dùng Base UI. User chỉ
dùng 1-2 component **không được** phải cài toàn bộ dependency của library.

- *Hiện trạng chưa đạt:* cả 5 dependency khai ở `dependencies` cấp package, nên
  `npm install tinita-react` kéo ~20 gói kể cả khi user chỉ dùng `Ping` (component 0 dependency).
- *Điều kiện thuận lợi:* tập dependency của 3 component hiện **rời nhau hoàn toàn** -
  `Ping`={}, `CarouselTicker`={clsx, tailwind-merge}, `FileTree`={@radix-ui/react-accordion,
  lucide-react}. Không có dep nào bị chia sẻ, nên tách được sạch.
- *Lãng phí đã xác định:* `motion` khai trong `dependencies` nhưng **không file nào import**
  (hit duy nhất là comment `prefers-reduced-motion` tại `src/ui/file-tree/types.ts:93`).
- Bốn hướng xử lý kèm đánh đổi: xem `system-architecture.md` mục "Chiến Lược Đóng Gói Dependency".

**RB-2: CSS của library không được xung đột với web của client.** Owner **đã gặp sự cố này khi
deploy thật** - Tailwind + CSS global của library đụng CSS của client. Đây là sự cố production đã
xảy ra, không phải lo xa.

- *Hiện trạng chưa đạt:* reset tự viết trên `*` và `body`, 22 token không prefix ghi vào namespace
  riêng của Tailwind v4 và trùng tên token shadcn, 27 class không prefix, CSS component nằm ngoài
  mọi `@layer`, Tailwind class thô trong JSX của `Ping`/`CarouselTicker` mà bundle không ship.
- Bảng đầy đủ có file:dòng: xem `system-architecture.md` mục "Bề Mặt Rò Rỉ CSS Ra Global Scope"
  và `design-guidelines.md` mục 4.
- Nguyên tắc rút ra: *library chỉ sở hữu CSS của component và token trong scope của mình; global
  CSS thuộc về consumer.*

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

## Target Architecture & Future Roadmap

**Status**: Định hướng được quyết định từ 2026-09-24, chưa triển khai toàn bộ.

### Nguyên tắc trung tâm: Own the Contract, Borrow the Machinery

- **Own**: Design tokens, component API, styling/visual language, accessibility contract, documentation
- **Borrow**: ARIA, focus management, keyboard navigation (từ headless primitives như Base UI)

### Foundation Chọn Cho 2026

- **Primitive Foundation**: **Base UI** (`@base-ui/react`) - headless, MIT, v1.8.0 (2026-09 release)
- **Distribution Model**: shadcn-as-reference (không phải dependency) - lấy convention + registry model
- **CSS Strategy**: Tailwind v4 build-time (Pure CSS output), không ship Preflight, prefix utilities, CSS variables cho customization, CSS layers cho isolation

**Lưu ý quan trọng (2026-09-24):** foundation sẽ **không đồng nhất** - owner dự định dùng `antd`
cho một số component và Base UI cho số khác. Điều này làm **anti-corruption layer trở thành bắt
buộc, không còn là tuỳ chọn**:

- Public API phải **giấu được** foundation bên dưới. Consumer viết `<Dialog>` của tinita không
  được thấy dấu vết của antd hay Base UI.
- Nếu để foundation lộ ra, user sẽ gặp **hai phong cách API lẫn lộn trong cùng một library** -
  đúng thứ mà nguyên tắc "own the contract" tồn tại để ngăn.
- Foundation không đồng nhất cũng khuếch đại RB-1: `antd` là dependency rất nặng, không được để
  nó thành gánh nặng cho người chỉ dùng một component Base UI.
- *Hiện trạng:* `antd` và Base UI **chưa xuất hiện ở đâu trong repo** (grep toàn bộ `packages/`,
  `apps/`, mọi `package.json` -> 0 kết quả). `FileTree` đang dùng thẳng
  `@radix-ui/react-accordion` mà chưa có lớp bọc nào - đây là khoảng cách so với định hướng, và
  đã rò rỉ ra CSS công khai qua `var(--radix-accordion-content-height)`.

### Kiến Trúc Phân Tầng (Target)

```
tokens -> core/primitives -> react (components) -> blocks -> registry
```

- tokens: color, spacing, radius, font, shadow, motion, breakpoint
- core: cn(), Slot, Portal, mergeProps, motion utilities
- react: 8-12 component chất lượng cao (Button, Input, Select, Dialog, Popover, Tabs, Tooltip, Table)
- blocks: DataTable, FilterBar, CommandPalette, Form, Sidebar, Dashboard
- registry: shadcn-style distribution (`registry.json` + source code)

### Phạm vi khởi đầu

**Chỉ xây 8-12 component chất lượng rất cao**, không 30-50:  
Button, Input, Select, Checkbox, Radio, Switch, Dialog, Popover, Tooltip, Dropdown, Tabs, Table.

API ở tầng đầu (Button/Input) sẽ lan ra toàn library - phải tốt ngay.

### CSS: 4 Lớp Bảo Vệ Chống Conflict

1. Không ship Preflight (`@import "tailwindcss"` kéo theo global reset)
2. Prefix toàn bộ utilities (tinita- prefix)
3. Token là CSS variables, không hard-code
4. CSS layers + scoped tokens nếu cần isolation mạnh

### Phase 1 (v0.0.x - Current)
- ✅ Monorepo setup (Turborepo + pnpm)
- ✅ tinita (4 utilities)
- ✅ tinita-react (2 hooks + 3 components)
- ✅ Storybook 10.1.4
- ✓ CSS handling (Tailwind v4 + CSS variables + prefix `tinita-`)

### Phase 2 (v0.1.x - Next - Target)
- 📋 Migrate to Base UI foundation
- 📋 Build 8-12 core components high-quality
- 📋 Set up registry model (shadcn-style)
- 📋 Implement CSS isolation strategy fully
- 📋 Expand tinita core utilities
- 📋 Comprehensive component tests

### Phase 3+ (v1.0.x+)
- 📋 Documentation site
- 📋 Accessibility compliance (WCAG 2.1 AA)
- 📋 Internationalization support
- 📋 Vue package (dùng headless primitives tương tự)
- 📋 Advanced theming + customization levels

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
