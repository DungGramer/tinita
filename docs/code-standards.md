# Code Standards & Codebase Structure

**Last Updated**: 2025-12-03
**Version**: 0.0.1
**Applies To**: All code within Tinita monorepo

## Overview

This document defines coding standards, file organization patterns, naming conventions, and best practices for the Tinita project. All code must adhere to these standards to ensure consistency, maintainability, tree-shakeability, and quality.

For comprehensive architectural principles, see [ARCHITECTURE.md](../ARCHITECTURE.md).
For contribution workflow, see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Core Development Principles

### YAGNI (You Aren't Gonna Need It)
- Implement features only when needed
- Avoid over-engineering and premature optimization
- Start simple, refactor when necessary
- Don't build infrastructure for hypothetical future requirements

### KISS (Keep It Simple, Stupid)
- Prefer simple, straightforward solutions
- Write code that's easy to understand and modify
- Choose clarity over cleverness
- Avoid unnecessary complexity

### DRY (Don't Repeat Yourself)
- Eliminate code duplication through abstraction
- Extract common logic into reusable functions/modules
- Use composition appropriately
- Maintain single source of truth

## File Organization Standards

### Monorepo Structure

```
tinita/
├── packages/                  # Main publishable packages
│   ├── tinita/               # Framework-agnostic core
│   └── tinita-react/         # React hooks and UI components
├── config/                    # Shared configurations
│   ├── eslint-config/        # ESLint presets
│   ├── typescript-config/    # TypeScript configs
│   └── ui/                   # Shared React components
├── scripts/                   # Build and publishing automation
├── docs/                      # Project documentation
├── package.json              # Root workspace config
├── pnpm-workspace.yaml       # pnpm workspaces definition
└── turbo.json                # Turborepo task pipeline
```

### Package Structure (tinita)

```
packages/tinita/
├── src/
│   ├── category1/            # Utility category
│   │   ├── utility1.ts       # One file = one function
│   │   └── utility2.ts
│   ├── category2/
│   │   └── utility3.ts
│   └── index.ts              # Barrel exports
├── tests/                     # Vitest test suites
│   ├── category1.test.ts
│   └── category2.test.ts
├── dist/                      # Build output (ESM + CJS)
├── package.json               # Package configuration
├── tsup.config.ts             # Build configuration
├── tsconfig.json              # TypeScript configuration
└── README.md                  # Package documentation
```

### Package Structure (tinita-react)

```
packages/tinita-react/
├── src/
│   ├── hooks/                 # React hooks (single-file)
│   │   ├── index.ts           # Hooks barrel export
│   │   ├── useHook1.ts        # One file = one hook
│   │   └── useHook2.ts
│   ├── ui/                    # UI components (folder-based)
│   │   ├── index.ts           # UI barrel export
│   │   ├── Component1/
│   │   │   ├── Component1.tsx  # Main component
│   │   │   ├── Component1.css  # Component styles
│   │   │   ├── SubComponent.tsx  # Private components
│   │   │   ├── types.ts        # Type definitions
│   │   │   ├── utils/          # Component utilities
│   │   │   └── index.tsx       # Re-export only
│   │   └── Component2/
│   ├── utils/                 # Shared utilities
│   │   └── autoInjectStyles.ts
│   ├── styles/                # Global styles
│   │   └── tailwind.css
│   └── index.ts               # Empty (no barrel export)
├── scripts/
│   └── build-css.mjs          # CSS build script
├── tests/                     # Component tests
├── dist/                      # Build output
├── .storybook/                # Storybook config
├── package.json
├── tsup.config.ts
├── tailwind.config.ts
└── README.md
```

## File Naming Conventions

### Source Files

**TypeScript Utilities** (packages/tinita):
- Format: `camelCase.ts`
- One file = one function
- Examples: `fileSize.ts`, `isEmpty.ts`, `generateUUID.ts`

**React Hooks** (packages/tinita-react/src/hooks):
- Format: `useCamelCase.ts`
- One file = one hook
- Examples: `useToggle.ts`, `useDebounce.ts`, `useLocalStorage.ts`

**React Components** (packages/tinita-react/src/ui):
- Format: `PascalCase.tsx` for main component
- Folder name: `PascalCase/`
- Examples: `FileTree/FileTree.tsx`, `Button/Button.tsx`

**Test Files**:
- Format: Match source file + `.test.ts` or `.test.tsx`
- Location: `tests/` directory
- Examples: `fileSize.test.ts`, `useToggle.test.tsx`

**CSS Files**:
- Format: Match component name + `.css`
- Location: Same directory as component
- Examples: `FileTree.css`, `Button.css`

### Directories

- Use `kebab-case` for category directories: `file-utils/`, `string-helpers/`
- Use `PascalCase` for component directories: `FileTree/`, `Button/`
- Use `camelCase` for utility directories: `utils/`, `helpers/`

## Naming Conventions

### TypeScript Code

**Variables**:
```typescript
// camelCase
const userName = 'John';
const isValid = true;
const itemCount = 10;
```

**Functions**:
```typescript
// camelCase
function calculateTotal(items: Item[]): number { }
const getUserById = (id: string) => { };
```

**Classes**:
```typescript
// PascalCase
class UserService { }
class AuthenticationManager { }
```

**Interfaces & Types**:
```typescript
// PascalCase
interface User { }
type UserRole = 'admin' | 'user';
```

**Constants**:
```typescript
// UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';
```

**Enums**:
```typescript
// PascalCase for enum name, UPPER_SNAKE_CASE for values
enum HttpStatus {
  OK = 200,
  NOT_FOUND = 404,
  SERVER_ERROR = 500
}
```

### React Components

**Component Names**:
```typescript
// PascalCase
export function FileTree(props: FileTreeProps) { }
export function Button(props: ButtonProps) { }
```

**Props Interfaces**:
```typescript
// PascalCase with Props suffix
export interface FileTreeProps {
  data: TreeNode[];
  onSelect?: (node: TreeNode) => void;
}
```

**Hooks**:
```typescript
// camelCase with use prefix
export function useToggle(initialValue = false) { }
export function useDebounce<T>(value: T, delay: number) { }
```

## File Size Management

### Hard Limit
**Maximum file size**: 500 lines of code

**Compliance**:
- Files exceeding 500 lines MUST be refactored
- Exception: Auto-generated files (with clear marking)
- Current status: All files comply ✅

### Refactoring Strategies

When a file exceeds 500 lines:

1. **Extract Utility Functions**: Move to separate `utils/` directory
2. **Component Splitting**: Break into smaller, focused components
3. **Service Classes**: Extract business logic to dedicated services
4. **Module Organization**: Group related functionality into modules

**Example**:
```
Before:
userService.ts (750 lines)

After:
services/
├── userService.ts (200 lines)      # Core service
├── userValidation.ts (150 lines)   # Validation logic
└── userRepository.ts (180 lines)   # Database operations
utils/
└── passwordHasher.ts (80 lines)    # Utility functions
```

## TypeScript Standards

### Configuration

**Strict Mode Required**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true
  }
}
```

**Type Safety**:
- NO `any` types (use `unknown` or specific types)
- Type guards return `value is Type` for narrowing
- Comprehensive type definitions for all public APIs
- No type assertions without justification

**Examples**:
```typescript
// ✅ GOOD: Type guard with narrowing
export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

// ❌ BAD: Using any
function processData(data: any) {  // Don't do this
  return data.value;
}

// ✅ GOOD: Using unknown with type guard
function processData(data: unknown) {
  if (isValidData(data)) {
    return data.value;
  }
  throw new Error('Invalid data');
}
```

### JSDoc Comments

**Public APIs**:
```typescript
/**
 * Convert file size to human readable format
 *
 * @param size - File size in bytes
 * @param base - Base for conversion (1000 or 1024)
 * @returns Human-readable file size string
 *
 * @example
 * fileSize(1024)        // => "1.02 KB"
 * fileSize(1024, 1024)  // => "1 KB"
 */
export function fileSize(size: number, base: 1000 | 1024 = 1000): string {
  // Implementation
}
```

## Build Configuration Standards

### tsup Configuration (Utilities)

**Template for packages/tinita**:
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/category/utility1.ts',
    'src/category/utility2.ts',
    // Add each utility explicitly
  ],
  format: ['cjs', 'esm'],
  dts: true,
  bundle: false,       // CRITICAL: Never bundle utilities
  splitting: false,
  clean: true,
  outDir: 'dist'
});
```

### tsup Configuration (React)

**Template for packages/tinita-react**:
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/hooks/useHook1.ts',
    'src/ui/Component1/index.tsx',
    'src/utils/utility.ts'
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

### Package.json Exports

**Subpath exports are MANDATORY**:
```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./category/utility": {
      "types": "./dist/category/utility.d.ts",
      "import": "./dist/category/utility.mjs",
      "require": "./dist/category/utility.cjs"
    }
  }
}
```

## CSS & Styling Standards (tinita-react)

### CSS Architecture

**Plug-and-Play Approach**:
- CSS files separate from JavaScript bundles
- Manual import for production builds
- Auto-inject for development/prototyping
- SSR compatibility with browser checks

### CSS File Structure

**Component CSS**:
```
src/ui/ComponentName/
├── ComponentName.tsx
├── ComponentName.css      # Component-specific styles
└── index.tsx
```

### CSS Naming Convention (BEM-like)

```css
/* Block */
.tinita-component { }

/* Element */
.tinita-component__item { }

/* Modifier */
.tinita-component__item--active { }
```

### CSS Variables

**Required for all customizable values**:
```css
:root {
  --tinita-component-bg: #ffffff;
  --tinita-component-text: #000000;
  --tinita-component-border: #e0e0e0;
  --tinita-component-hover: #f5f5f5;
}

.tinita-component {
  background-color: var(--tinita-component-bg);
  color: var(--tinita-component-text);
  border: 1px solid var(--tinita-component-border);
}

.tinita-component:hover {
  background-color: var(--tinita-component-hover);
}
```

### Auto-Inject Styles Pattern

```typescript
import { useEffect } from 'react';
import { autoInjectStyles } from '../../utils/autoInjectStyles';

const CSS_CONTENT = `/* CSS content */`;

export function Component({ autoInjectStyles: shouldAutoInject = true, ...props }) {
  useEffect(() => {
    if (shouldAutoInject && typeof window !== 'undefined') {
      autoInjectStyles('tinita-component-styles', CSS_CONTENT);
    }
  }, [shouldAutoInject]);

  return <div className="tinita-component">...</div>;
}
```

## Testing Standards

### Test Framework
**Vitest** for all testing

### Test File Organization
```
tests/
├── category1.test.ts      # Utility tests
├── category2.test.ts
└── ui/
    └── Component.test.tsx # Component tests
```

### Test Structure

**Unit Tests**:
```typescript
import { describe, it, expect } from 'vitest';
import { fileSize } from '../src/file/fileSize';

describe('fileSize', () => {
  it('should convert bytes to KB', () => {
    expect(fileSize(1024)).toBe('1.02 KB');
  });

  it('should use binary base when specified', () => {
    expect(fileSize(1024, 1024)).toBe('1 KB');
  });

  it('should return "0 Byte" for zero size', () => {
    expect(fileSize(0)).toBe('0 Byte');
  });
});
```

**Component Tests**:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileTree } from '../src/ui/FileTree';

describe('FileTree', () => {
  it('should render tree structure', () => {
    render(<FileTree data={mockData} />);
    expect(screen.getByText('folder1')).toBeInTheDocument();
  });

  it('should expand on click', () => {
    render(<FileTree data={mockData} />);
    fireEvent.click(screen.getByText('folder1'));
    expect(screen.getByText('file1.txt')).toBeVisible();
  });
});
```

### Test Coverage Requirements
- **Unit tests**: > 80% code coverage
- **Component tests**: Critical user interactions
- **Integration tests**: Complex workflows
- **Error scenarios**: All error paths tested

## Import/Export Patterns

### Core Package (tinita)

**One file = one function**:
```typescript
// src/string/isEmpty.ts
export function isEmpty(value: unknown): value is '' {
  return typeof value === 'string' && value.length === 0;
}
```

**Barrel exports** (src/index.ts):
```typescript
export * from './file/fileSize';
export * from './file/getFileNameParts';
export * from './string/isEmpty';
```

**Usage**:
```typescript
// Both work, subpath is optimal for tree-shaking
import { fileSize } from 'tinita';
import { fileSize } from 'tinita/file/fileSize';  // Recommended
```

### React Package (tinita-react)

**NO barrel imports from main entry**:
```typescript
// src/index.ts
// Empty - no exports
```

**Category barrel exports**:
```typescript
// src/hooks/index.ts
export * from './useToggle';
export * from './useDebounce';

// src/ui/index.ts
export * from './FileTree';
export * from './Button';
```

**Usage** (MUST use category or subpath):
```typescript
// ✅ GOOD: Category import
import { useToggle } from 'tinita-react/hooks';
import { FileTree } from 'tinita-react/ui';

// ✅ GOOD: Subpath import
import { useToggle } from 'tinita-react/hooks/useToggle';

// ❌ BAD: Main entry import (not allowed)
import { useToggle } from 'tinita-react';  // This won't work
```

## Component Colocation Pattern (tinita-react UI)

### MANDATORY Pattern

**Main component in separate file**:
```
src/ui/ComponentName/
├── ComponentName.tsx       # Main component logic (REQUIRED)
├── ComponentName.css       # Component styles
├── SubComponent.tsx        # Private components
├── types.ts                # Type definitions
├── utils/                  # Component utilities
└── index.tsx               # Re-exports only (REQUIRED)
```

**Why separate file + index.tsx?**
- **Discoverability**: Easy to find `ComponentName.tsx` in file tree
- **Maintainability**: Clear separation between logic and exports
- **Scalability**: Room to add types, utils without cluttering index
- **Industry Standard**: Follows "1 file = 1 unit" convention

### Implementation

**Main Component** (ComponentName.tsx):
```typescript
export interface ComponentNameProps {
  data: any[];
}

export function ComponentName({ data }: ComponentNameProps) {
  // Component implementation
}
```

**Index Re-export** (index.tsx):
```typescript
export { ComponentName } from './ComponentName';
export type { ComponentNameProps } from './ComponentName';
```

## Code Quality Standards

### Linting

**ESLint configuration**:
- Extends shared config: `@repo/eslint-config/base`
- No warnings allowed in production
- Auto-fix on save recommended

**Run linting**:
```bash
pnpm lint           # Lint all packages
pnpm lint --fix     # Auto-fix issues
```

### Formatting

**Prettier configuration**:
- Shared config in `prettier.config.js`
- 2-space indentation
- Single quotes for strings
- Trailing commas

**Run formatting**:
```bash
pnpm format         # Format all files
```

### Type Checking

**Must pass with strict mode**:
```bash
pnpm check-types    # Type check all packages
```

## Error Handling

### Input Validation

**Always validate inputs**:
```typescript
export function divide(a: number, b: number): number {
  if (!isNumber(a) || !isNumber(b)) {
    throw new TypeError('Arguments must be numbers');
  }
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}
```

### Type Guards

**Use type guards for runtime validation**:
```typescript
function isValidData(data: unknown): data is ValidData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'field' in data &&
    typeof data.field === 'string'
  );
}
```

## Documentation Standards

### Package README Requirements

Every package MUST have:
1. Installation instructions
2. Basic usage examples
3. API reference
4. Import patterns (barrel vs subpath)
5. TypeScript types
6. Link to main documentation

### Component Documentation

UI components SHOULD have:
1. Component README in component directory
2. Storybook stories (`.stories.tsx`)
3. Props documentation (TypeScript interfaces)
4. Usage examples
5. CSS customization guide

## Git Standards

### Commit Messages

**Format**: Conventional Commits
```
type(scope): description

feat(tinita): add isEmpty string utility
fix(react): resolve FileTree expand issue
docs: update code standards
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Maintenance tasks

### Branch Naming

**Format**: `type/description`
```
feature/add-debounce-hook
fix/filetree-expand-bug
docs/update-standards
```

## Automated Workflows

### Pre-Commit Checklist

Before committing:
- ✅ No secrets or credentials
- ✅ All tests pass (`pnpm test`)
- ✅ No linting errors (`pnpm lint`)
- ✅ Type checking passes (`pnpm check-types`)
- ✅ Files under 500 lines
- ✅ Conventional commit message

### Pre-Build Checklist

Before building:
- ✅ Run `generate:exports` for updated exports
- ✅ Clean previous build (`rimraf dist`)
- ✅ Verify tsup configuration
- ✅ Check package.json exports

## Performance Standards

### Bundle Size

**Targets**:
- Core utilities: < 1KB per function
- React hooks: < 2KB per hook
- UI components: < 5KB per component (excluding CSS)

**Verification**:
- Monitor with bundlephobia
- Test tree-shaking effectiveness
- Check dist/ output sizes

### Build Performance

**Targets**:
- Package build: < 10 seconds
- Full monorepo build: < 30 seconds
- Test execution: < 5 seconds per package

## Security Standards

### No Secrets in Code

**Never commit**:
- API keys
- Passwords
- Tokens
- Credentials

**Use environment variables**:
```typescript
// ✅ GOOD
const apiKey = process.env.API_KEY;

// ❌ BAD
const apiKey = 'sk-1234567890';  // Don't do this
```

### Input Sanitization

**Always sanitize user inputs**:
```typescript
export function processUserInput(input: string): string {
  // Validate and sanitize
  if (typeof input !== 'string') {
    throw new TypeError('Input must be string');
  }
  return input.trim().toLowerCase();
}
```

## Compliance Checklist

### Before Publishing

- [ ] All files < 500 lines
- [ ] All tests pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Subpath exports configured
- [ ] README.md complete
- [ ] Version bumped (SemVer)
- [ ] No bundled framework dependencies
- [ ] Tree-shaking verified

### Architecture Compliance

- [ ] One file = one function/hook/composable
- [ ] Per-file builds (`bundle: false`)
- [ ] No runtime dependencies (core package)
- [ ] Framework code only in framework packages
- [ ] Frameworks as peer dependencies
- [ ] Subpath exports for tree-shaking
- [ ] CSS separate from JS bundles

## References

### Internal Documentation
- [Project Overview PDR](./project-overview-pdr.md)
- [Codebase Summary](./codebase-summary.md)
- [System Architecture](./system-architecture.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Detailed architectural principles
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution workflow

### External Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Conventional Commits](https://conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

## Summary

The Tinita monorepo follows strict standards to ensure:
1. **Tree-shaking**: One file = one function, per-file builds
2. **Type Safety**: TypeScript strict mode, comprehensive types
3. **Maintainability**: 500-line limit, clear organization
4. **Quality**: 80%+ test coverage, linting, formatting
5. **Performance**: Minimal bundle sizes, fast builds
6. **Developer Experience**: Consistent patterns, clear documentation

These standards are non-negotiable and apply to all contributions.
