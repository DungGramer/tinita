# Tinita

**A tree-shakeable TypeScript utility ecosystem for modern web development**

Tinita is a high-performance monorepo delivering framework-agnostic utilities, React hooks, and UI components with zero runtime bloat. Built with Turborepo + pnpm + tsup, emphasizing optimal bundle sizes and exceptional developer experience.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/tinita)](https://www.npmjs.com/package/tinita)

---

## Key Features

- **Zero Bundle Bloat**: One file = one function architecture with guaranteed tree-shaking
- **Framework Agnostic Core**: Pure TypeScript utilities that work everywhere
- **React Ecosystem**: Hooks and UI components with automatic CSS handling
- **TypeScript First**: Full type safety with strict mode and comprehensive `.d.ts` generation
- **Per-File Builds**: Optimal tree-shaking through unbundled module output
- **Automated Exports**: Script-generated subpath exports for every utility

---

## Quick Start

### Installation

```bash
# Core utilities (framework-agnostic)
pnpm add tinita

# React hooks and UI components
pnpm add tinita-react react
```

### Basic Usage

**Core Utilities (tinita)**:

```typescript
// File utilities
import { fileSize } from 'tinita/file/fileSize';

fileSize(1024);        // "1.02 KB"
fileSize(1024, 1024);  // "1 KB" (binary base)

// UUID generation (cross-platform)
import { generateUUID } from 'tinita/uuid/generateUUID';

const id = generateUUID();  // "550e8400-e29b-41d4-a716-446655440000"
```

**React Hooks**:

```typescript
import { useToggle } from 'tinita-react/hooks';

function MyComponent() {
  const [isOpen, toggle] = useToggle(false);

  return (
    <div>
      <button onClick={toggle}>Toggle</button>
      {isOpen && <div>Visible content</div>}
    </div>
  );
}
```

**React UI Components**:

```typescript
// Import CSS (once in your app)
import 'tinita-react/styles.css';

// Use components
import { FileTree } from 'tinita-react/ui';

const data = [
  { id: '1', name: 'src', type: 'folder', children: [...] },
  { id: '2', name: 'README.md', type: 'file' }
];

function App() {
  return <FileTree data={data} />;
}
```

---

## Project Structure

```
tinita/
├── packages/
│   ├── tinita/           # Core utilities (0 dependencies)
│   └── tinita-react/     # React hooks + UI components
├── config/               # Shared ESLint, TypeScript configs
├── scripts/              # Build automation
├── docs/                 # Comprehensive documentation
└── turbo.json            # Turborepo task pipeline
```

---

## Packages

### tinita (Core)
Framework-agnostic TypeScript utilities with zero dependencies. Includes file utilities and UUID generation.

### tinita-react
React hooks (`useToggle`) and UI components (`FileTree`, `Ping`) with automatic CSS handling.

---

## Development

### Prerequisites

- **Node.js**: >= 18.0.0
- **pnpm**: >= 9.0.0

### Setup

```bash
# Clone repository
git clone https://github.com/dunggramer/tinita.git
cd tinita

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Available Commands

```bash
# Development
pnpm dev          # Watch mode for all packages
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm test --watch # Run tests in watch mode

# Code Quality
pnpm lint         # Lint all packages
pnpm check-types  # Type check all packages
pnpm format       # Format code with Prettier

# Publishing
pnpm publish:dry-run    # Test publishing
pnpm publish:tinita     # Publish tinita package
pnpm publish:tinita-react # Publish tinita-react package
pnpm publish:all        # Publish all packages
```

### Adding New Utilities

1. Create utility file in `packages/tinita/src/` or `packages/tinita-react/src/`
2. Run `pnpm run generate:exports` to update exports
3. Write tests in `tests/`
4. Build and verify: `pnpm build && pnpm test`

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed workflow.

---

## Architecture

**Tree-Shaking Guarantee**: Import one function, ship only that function (~500 bytes). Achieved through per-file builds, subpath exports, and zero bundling.

**Monorepo Stack**: Turborepo (task orchestration), pnpm (dependencies), tsup (builds), Vitest (tests).

See [System Architecture](./docs/system-architecture.md) for complete details.

---

## Documentation

### Core Documentation

- **[Project Overview & PDR](./docs/project-overview-pdr.md)** - Vision, roadmap, requirements
- **[Codebase Summary](./docs/codebase-summary.md)** - Current state, metrics, structure
- **[Code Standards](./docs/code-standards.md)** - Coding conventions, file organization
- **[System Architecture](./docs/system-architecture.md)** - Build system, data flow, module resolution

### Developer Guides

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architectural principles and compliance rules
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution workflow and guidelines
- **[CLAUDE.md](./CLAUDE.md)** - AI assistant development instructions

### Package-Specific

- **[tinita README](./packages/tinita/README.md)** - Core utilities documentation
- **[tinita-react README](./packages/tinita-react/README.md)** - React package documentation
- **[CSS Guide](./packages/tinita-react/CSS_GUIDE.md)** - CSS handling patterns

---

## Contributing

We welcome contributions! Read [CONTRIBUTING.md](./CONTRIBUTING.md) and [ARCHITECTURE.md](./ARCHITECTURE.md) before starting. Key principles: one-file-one-function, pass all tests, follow code standards.

---

## Roadmap

**v0.0.x (Current)**: Monorepo setup, core utilities, React package, automated exports
**v0.1.x (Next)**: Vue/Node packages, expand utilities, more hooks/components
**v1.0.x (Future)**: Documentation site, playground, benchmarks, a11y, i18n

See [Project Overview PDR](./docs/project-overview-pdr.md) for detailed roadmap.

---

## License

[MIT](./LICENSE) - Copyright (c) 2025 Tinita Contributors

---

## Links

- **GitHub**: [https://github.com/dunggramer/tinita](https://github.com/dunggramer/tinita)
- **NPM (tinita)**: [https://www.npmjs.com/package/tinita](https://www.npmjs.com/package/tinita)
- **NPM (tinita-react)**: [https://www.npmjs.com/package/tinita-react](https://www.npmjs.com/package/tinita-react)

---

**Built with care for developers who value bundle size and code quality.**
