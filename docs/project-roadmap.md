# Tinita - Project Roadmap

**Last Updated:** 2026-03-30
**Current Version:** 0.0.1 (tinita), 0.0.2-alpha.1 (tinita-react)
**Repository:** https://github.com/dunggramer/tinita

## Executive Summary

Tinita is a tree-shakeable TypeScript utility ecosystem providing framework-agnostic utilities, React hooks, and UI components with zero runtime bloat. The project has established core infrastructure and is expanding utilities, hooks, and components while building test coverage.

---

## Phase Overview

### Phase 1: Foundation (CURRENT - v0.0.x)
**Status:** ✅ Complete | **Target Completion:** v0.1.0
**Progress:** 60%

Established core monorepo infrastructure, build system, and initial packages.

**Completed Achievements:**
- ✅ Turborepo monorepo setup (2.6.1)
- ✅ Core utilities package (`tinita` v0.0.1): 4 utilities (file, uuid)
- ✅ React package (`tinita-react` v0.0.2-alpha.1): 2 hooks + 3 UI components
- ✅ Tailwind CSS v4 build-time compilation to pure CSS
- ✅ CSS architecture (globals, animations, component-specific)
- ✅ Per-file builds with tree-shaking guarantee
- ✅ Shared ESLint and TypeScript configurations
- ✅ Publishing pipeline with NPM automation

**Remaining Foundation Work:**
- 📋 Export hooks/useIsomorphicLayoutEffect from hooks/index.ts
- 📋 Test infrastructure setup (Vitest configured, no tests written)
- 📋 CI/CD with GitHub Actions
- 📋 Comprehensive documentation

---

### Phase 2: Expansion (PLANNED - v0.1.x)
**Status:** 📋 Planned | **Target Start:** Q2 2026
**Progress:** 0%

Expand utilities, hooks, and components while establishing test coverage and documentation.

**Planned Utilities:**
- String helpers (isEmpty, trim, capitalize, etc.)
- Array utilities (flatten, compact, unique, etc.)
- Object utilities (merge, pick, omit, etc.)
- Number utilities (clamp, random, format, etc.)

**Planned React Hooks:**
- useDebounce (debounced value hook)
- useLocalStorage (persistent state)
- usePrevious (track previous value)
- useWindowSize (responsive design)
- useClickOutside (click outside detection)

**Planned UI Components:**
- Button (accessible button variants)
- Input (text input with validation)
- Modal (dialog component)
- Toast (notification system)
- Tabs (tabbed content)

**Quality Goals:**
- Test coverage > 80% for all packages
- Zero TypeScript errors with strict mode
- Comprehensive JSDoc for all public APIs
- CI/CD pipeline with automated testing

---

### Phase 3: Framework Expansion (FUTURE - v0.2.x)
**Status:** 📋 Planned | **Target Start:** Q3 2026
**Progress:** 0%

Add support for additional frameworks while maintaining zero-dependency core.

**New Packages:**
- `tinita-vue`: Vue 3 composables (matching React hooks)
- `tinita-node`: Node.js-specific utilities (file, path, stream helpers)
- `tinita-cli`: Command-line utilities for development

**Framework Bridges:**
- Vue version of reactive hooks
- Node.js file system abstractions
- Cross-platform path utilities

---

### Phase 4: Documentation & Tools (FUTURE - v1.0.x)
**Status:** 📋 Planned | **Target Start:** Q4 2026
**Progress:** 0%

Build comprehensive documentation and developer tools.

**Documentation:**
- VitePress documentation site
- Interactive API reference
- Code examples for all utilities
- Migration guides
- Performance benchmarks

**Developer Tools:**
- CLI scaffolding tool
- Bundle size analyzer
- Tree-shaking validator
- Component playground

**Community:**
- Contribution guidelines
- Community Discord
- Open source governance
- Release announcements

---

## Current Development Focus

### 1. Bug Fixes & Completions
- [ ] Export useIsomorphicLayoutEffect from hooks/index.ts
- [ ] Clean up build-entry.css (currently nearly empty)
- [ ] Verify all component CSS imports and exports

### 2. Testing Infrastructure
- [ ] Write tests for all 4 core utilities (tinita)
- [ ] Write tests for all 2 hooks (tinita-react)
- [ ] Write tests for all 3 UI components (tinita-react)
- [ ] Set up test coverage reporting
- [ ] Target: > 80% coverage

### 3. CI/CD Setup
- [ ] Create GitHub Actions workflows
- [ ] Automated linting on PR
- [ ] Automated testing on PR
- [ ] Automated type checking on PR
- [ ] Automated publishing on release

### 4. Documentation
- [ ] Complete API documentation for all utilities
- [ ] Write component usage guides
- [ ] Create CSS customization guides
- [ ] Add troubleshooting section

---

## Success Metrics

### v0.0.x (Current)
- NPM packages published and installable
- Core utilities working with zero dependencies
- React components rendering with CSS styles
- Tree-shaking verified (bundle size < 1KB per utility)

### v0.1.x (Next Phase)
- 20+ utilities across core package
- 8+ React hooks
- 5+ UI components
- Test coverage > 80%
- CI/CD fully automated
- Documentation coverage 100%

### v1.0.x (Maturity)
- 100+ utilities across all packages
- 3+ framework packages (core, React, Vue)
- Comprehensive documentation site
- 1000+ GitHub stars
- Active community with regular contributors

---

## Feature Inventory

### Core Features (COMPLETE)
- ✅ Monorepo with Turborepo orchestration
- ✅ Per-file builds with tree-shaking
- ✅ Subpath exports for all utilities
- ✅ TypeScript strict mode
- ✅ ESLint & Prettier enforcement
- ✅ Zero dependencies in core package
- ✅ React package with hooks and components
- ✅ Tailwind CSS v4 build-time compilation
- ✅ CSS auto-inject and manual import modes

### Recent Additions (2026-03)
- ✅ CarouselTicker component (infinite scroll)
- ✅ Animation system (18+ keyframes)
- ✅ useIsomorphicLayoutEffect hook
- ✅ Tailwind v4 architecture

### In Progress
- 🔄 Test coverage buildup
- 🔄 CI/CD setup
- 🔄 Documentation expansion

### Planned
- 📋 Utility expansion (20+ new utilities)
- 📋 Hook expansion (8+ new hooks)
- 📋 Component expansion (5+ new components)
- 📋 Vue package (tinita-vue)
- 📋 Node package (tinita-node)
- 📋 Documentation site

---

## Known Limitations & Constraints

### Current Limitations
- No tests written yet (infrastructure ready)
- No CI/CD pipeline (manual publishing)
- useIsomorphicLayoutEffect not exported from hooks barrel
- build-entry.css needs cleanup

### Design Constraints
- One file = one utility/hook/composable (enforced)
- No external dependencies in core package (enforced)
- File size limit of 500 lines per file
- Framework dependencies as peer dependencies only

### Technical Constraints
- Node.js >= 18.0.0 required
- pnpm workspaces for monorepo structure
- Manual export management (no auto-generation)

---

## Dependency & Integration Points

### Required
- Node.js 18.0.0+
- pnpm 9.0.0+
- Git (for version control)

### Development Tools
- Turborepo 2.6.1
- TypeScript 5.9.2
- ESLint 9.39.1
- Prettier 3.6.2
- Vitest 4.0.14

### Framework Dependencies
- React >= 18.0.0 (tinita-react)
- Vue >= 3.0.0 (tinita-vue, planned)

---

## Milestone Schedule

### Q1 2026 (Current)
| Milestone | Status | Target |
|-----------|--------|--------|
| useIsomorphicLayoutEffect export fix | 📋 Pending | 2026-04-15 |
| Core utility tests | 📋 Pending | 2026-04-30 |
| React hook tests | 📋 Pending | 2026-04-30 |
| React component tests | 📋 Pending | 2026-04-30 |
| CI/CD setup | 📋 Pending | 2026-05-15 |

### Q2 2026
| Milestone | Status | Target |
|-----------|--------|--------|
| 8+ new utilities added | 📋 Planned | 2026-06-30 |
| 5+ new React hooks | 📋 Planned | 2026-06-30 |
| 3+ new UI components | 📋 Planned | 2026-06-30 |
| Test coverage > 80% | 📋 Planned | 2026-06-30 |
| v0.1.0 release | 📋 Planned | 2026-06-30 |

### Q3 2026
| Milestone | Status | Target |
|-----------|--------|--------|
| tinita-vue package created | 📋 Planned | 2026-09-30 |
| tinita-node package created | 📋 Planned | 2026-09-30 |
| Documentation site launched | 📋 Planned | 2026-09-30 |

---

## Risk Management

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Export generation complexity | Medium | High | Manual management reduces complexity |
| Test coverage gaps | Medium | Medium | Automated test runners, CI enforcement |
| CSS maintenance burden | Low | Low | Component-specific CSS keeps complexity local |
| Breaking changes between versions | High | Low | Semantic versioning, changelog discipline |
| Framework dependency version conflicts | Medium | Medium | Peer dependency ranges, clear documentation |

---

## Long-Term Vision (v1.0+)

### 2027 Goals
- Reach 100+ utilities across core package
- Establish as community standard for tree-shakeable utilities
- Build active open-source community (100+ stars)
- Integrate with major frameworks (Next.js, Nuxt, etc.)
- Monthly NPM downloads in 10K+ range

### 2028+ Aspirations
- Become go-to utility library ecosystem
- Support 5+ languages/runtimes (JS, Python, Rust, etc.)
- Educational content and tutorials
- Commercial support options
- 1M+ monthly NPM downloads

---

## Decision Log

### Decision 1: Manual Export Management
**Date:** 2026-03-30
**Status:** Implemented
**Rationale:** Removed automated export generation script for explicit control over what gets exported. Manual management provides clarity and prevents unexpected changes.

### Decision 2: Tailwind CSS v4 Build-Time
**Date:** 2026-03
**Status:** Implemented
**Rationale:** Tailwind v4 compiles to pure CSS at build time, eliminating runtime dependency while allowing developers to use Tailwind utilities in component CSS.

### Decision 3: Component Colocation Pattern
**Date:** 2025-12
**Status:** Implemented
**Rationale:** Main component file + index.ts re-export pattern improves discoverability and maintainability. Follows industry best practices (Meta, Google, Microsoft).

---

## Related Documentation

- [Project Overview & PDR](./project-overview-pdr.md)
- [Codebase Summary](./codebase-summary.md)
- [Code Standards](./code-standards.md)
- [System Architecture](./system-architecture.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## Contacts & Links

- **GitHub:** https://github.com/dunggramer/tinita
- **NPM (tinita):** https://www.npmjs.com/package/tinita
- **NPM (tinita-react):** https://www.npmjs.com/package/tinita-react
- **Author:** DungGramer (dung.dev.gramer@gmail.com)

---

**Maintained By:** Tinita Core Team
**Last Review:** 2026-03-30
**Next Review Target:** 2026-06-30
