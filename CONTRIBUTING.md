# Contributing to tinita

Thank you for your interest in contributing to tinita! This document provides guidelines and instructions for contributing to this monorepo.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Adding New Utilities/Hooks/Composables](#adding-new-utilitieshookscomposables)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Architectural Principles](#architectural-principles)
- [Versioning and Publishing](#versioning-and-publishing)

## Code of Conduct

Be respectful, professional, and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 9.0.0

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/tinita.git
   cd tinita
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Build all packages**:
   ```bash
   pnpm build
   ```

4. **Run tests**:
   ```bash
   pnpm test
   ```

## Development Workflow

### Monorepo Structure

tinita is a Turborepo monorepo with the following structure:

```
tinita/
  ├── packages/
  │   ├── core/          # Framework-agnostic utilities
  │   ├── react/         # React hooks
  │   ├── vue/           # Vue composables
  │   └── node/          # Node.js utilities
  ├── config/
  │   ├── eslint-config/ # Shared ESLint configurations
  │   ├── typescript-config/ # Shared TypeScript configurations
  │   └── ui/            # Internal shared components
  └── ARCHITECTURE.md    # Detailed architectural principles
```

### Available Commands

```bash
# Build all packages
pnpm build

# Build specific package
turbo build --filter=@tinita/core

# Run tests
pnpm test

# Run tests for specific package
cd packages/core && pnpm test

# Lint all packages
pnpm lint

# Type check all packages
pnpm check-types

# Format code
pnpm format

# Development mode (watch mode)
pnpm dev
```

## Adding New Utilities/Hooks/Composables

### Checklist for Adding New Features

When adding a new utility, hook, or composable, follow this checklist:

- [ ] Create new file in appropriate `src/` directory (one file = one function)
- [ ] Add to `tsup` `entry` array in `tsup.config.ts`
- [ ] Add subpath export to `package.json`
- [ ] Export from `src/index.ts` (for barrel imports)
- [ ] Write comprehensive tests in `tests/`
- [ ] Document in package `README.md` with usage examples
- [ ] Run `pnpm build` and verify `dist/` output
- [ ] Run `pnpm test` and ensure all tests pass
- [ ] Test import: `import X from '@tinita/pkg/path/to/util'`

### Example: Adding a New Utility to @tinita/core

1. **Create the utility file**:
   ```typescript
   // packages/core/src/string/isEmpty.ts
   export function isEmpty(value: unknown): value is '' {
     return typeof value === 'string' && value.length === 0;
   }
   ```

2. **Update tsup.config.ts**:
   ```typescript
   // packages/core/tsup.config.ts
   export default defineConfig({
     entry: [
       'src/index.ts',
       'src/number/isNumber.ts',
       'src/number/isPositive.ts',
       'src/string/isEmpty.ts', // ← Add this
     ],
     // ...
   });
   ```

3. **Update package.json exports**:
   ```json
   {
     "exports": {
       ".": { ... },
       "./string/isEmpty": {
         "import": "./dist/string/isEmpty.mjs",
         "require": "./dist/string/isEmpty.cjs",
         "types": "./dist/string/isEmpty.d.ts"
       }
     }
   }
   ```

4. **Add to barrel export**:
   ```typescript
   // packages/core/src/index.ts
   export * from './number/isNumber';
   export * from './number/isPositive';
   export * from './string/isEmpty'; // ← Add this
   ```

5. **Write tests**:
   ```typescript
   // packages/core/tests/string.test.ts
   import { describe, it, expect } from 'vitest';
   import { isEmpty } from '../src/string/isEmpty';

   describe('isEmpty', () => {
     it('should return true for empty string', () => {
       expect(isEmpty('')).toBe(true);
     });

     it('should return false for non-empty string', () => {
       expect(isEmpty('hello')).toBe(false);
     });

     it('should return false for non-string values', () => {
       expect(isEmpty(null)).toBe(false);
       expect(isEmpty(undefined)).toBe(false);
       expect(isEmpty(0)).toBe(false);
     });
   });
   ```

6. **Update README**:
   Add documentation with usage examples to `packages/core/README.md`.

7. **Build and test**:
   ```bash
   cd packages/core
   pnpm build
   pnpm test
   ```

8. **Verify import**:
   ```typescript
   import { isEmpty } from '@tinita/core/string/isEmpty';
   ```

### Example: Adding a New Hook to @tinita/react

1. **Create the hook file**:
   ```typescript
   // packages/react/src/useToggle.ts
   import { useState, useCallback } from 'react';

   export function useToggle(initialValue = false): [boolean, () => void] {
     const [value, setValue] = useState(initialValue);
     const toggle = useCallback(() => setValue(v => !v), []);
     return [value, toggle];
   }
   ```

2. **Update tsup.config.ts**:
   ```typescript
   entry: ['src/index.ts', 'src/useDebounce.ts', 'src/useToggle.ts'],
   ```

3. **Update package.json exports**:
   ```json
   "./useToggle": {
     "import": "./dist/useToggle.mjs",
     "require": "./dist/useToggle.cjs",
     "types": "./dist/useToggle.d.ts"
   }
   ```

4. **Add to barrel export**:
   ```typescript
   // packages/react/src/index.ts
   export * from './useDebounce';
   export * from './useToggle';
   ```

5. **Write tests** using `@testing-library/react`.

6. **Update README** with usage examples.

## Testing

### Writing Tests

- Use **Vitest** for all tests
- Aim for **100% code coverage**
- Test edge cases and error conditions
- Use descriptive test names

### Test File Structure

```
packages/<package>/
  tests/
    utility-name.test.ts
    hook-name.test.tsx   (for React)
    composable-name.test.ts (for Vue)
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage

# Run tests for specific package
cd packages/core && pnpm test
```

## Code Quality

### Linting

We use **ESLint** with strict configurations:

```bash
# Lint all packages
pnpm lint

# Fix auto-fixable issues
pnpm lint --fix
```

### Type Checking

All code must pass TypeScript strict mode:

```bash
# Type check all packages
pnpm check-types
```

### Formatting

We use **Prettier** for code formatting:

```bash
# Format all files
pnpm format
```

### Pre-commit Checklist

Before committing, ensure:

- [ ] Code builds successfully (`pnpm build`)
- [ ] All tests pass (`pnpm test`)
- [ ] No linting errors (`pnpm lint`)
- [ ] No type errors (`pnpm check-types`)
- [ ] Code is formatted (`pnpm format`)

## Architectural Principles

**IMPORTANT**: Read [ARCHITECTURE.md](./ARCHITECTURE.md) before making significant changes.

### Key Principles

1. **Tree-shaking is mandatory**: One file = one function/hook/composable
2. **Per-file builds**: Use `bundle: false` in tsup
3. **Subpath exports**: Every utility must have a subpath export
4. **Framework isolation**: No React/Vue code in `@tinita/core`
5. **No runtime dependencies on micro-packages**: Core must be self-contained
6. **TypeScript-first**: All code written in TypeScript with strict mode

### Common Mistakes to Avoid

❌ **DON'T**:
- Bundle everything together
- Put framework code in core package
- Bundle React/Vue dependencies
- Skip subpath exports
- Skip tests

✅ **DO**:
- Keep modules separate with `bundle: false`
- Maintain clear package boundaries
- Externalize framework dependencies
- Add subpath exports for all utilities
- Write comprehensive tests

## Versioning and Publishing

### Semantic Versioning

We follow [SemVer](https://semver.org/) strictly:

- **Patch** (0.0.x): Bug fixes, no API changes
- **Minor** (0.x.0): New features, backward-compatible
- **Major** (x.0.0): Breaking changes

### Before Publishing

- [ ] All tests pass
- [ ] Linting passes
- [ ] TypeScript compiles
- [ ] Version bumped according to semver
- [ ] CHANGELOG.md updated
- [ ] README.md is accurate
- [ ] Subpath exports configured
- [ ] No bundled framework dependencies

### Publishing Process

```bash
# Build the package
cd packages/<package>
pnpm build

# Test the built package
pnpm test

# Publish (dry run first)
pnpm publish --dry-run

# Publish for real
pnpm publish
```

## Package-Specific Guidelines

### @tinita/core

- Framework-agnostic utilities only
- No dependencies on React, Vue, or Node.js-specific APIs
- Must work in browser and Node.js environments

### @tinita/react

- React hooks only
- React must be in `peerDependencies`
- Must externalize React in tsup config
- Test with `@testing-library/react`

### @tinita/vue

- Vue composables only
- Vue must be in `peerDependencies`
- Must externalize Vue in tsup config
- Use Composition API only (Vue 3+)

### @tinita/node

- Node.js-specific utilities only
- Can use Node.js built-in modules
- Document that it's Node.js-only (not for browser)

## Getting Help

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architectural guidelines
- Read [CLAUDE.md](./CLAUDE.md) for AI assistant guidance
- Check existing code for patterns and examples
- Open an issue for questions or clarifications

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to tinita! 🎉
