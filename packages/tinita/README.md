# Tinita

Modern TypeScript utility library with tree-shaking support.

## Installation

```bash
npm install tinita
# or
yarn add tinita
# or
pnpm add tinita
```

## Requirements

- TypeScript >= 5.0 (recommended)
- No runtime dependencies

## Features

- **Zero dependencies**: No external runtime dependencies
- **Tree-shakeable**: One file = one function for optimal bundle size
- **TypeScript-first**: Full type safety with type guards and strict mode
- **Modern build**: ESM and CJS support with subpath exports
- **Thoroughly tested**: Comprehensive test coverage
- **Framework-agnostic**: Works with any JavaScript framework or vanilla JS

## What's Included

Tinita provides a comprehensive collection of utilities organized by domain:

- **Type guards & validators**: Type-safe runtime checks for numbers, strings, objects, arrays, and more
- **File utilities**: File name handling, size formatting, duplicate detection
- **UUID generation**: Cross-platform UUID v4 with automatic fallbacks
- **String utilities**: Manipulation, validation, and transformation helpers
- **Array utilities**: Filtering, mapping, and data structure operations
- **Object utilities**: Deep cloning, merging, path access
- **Date utilities**: Formatting, parsing, and manipulation

All utilities follow consistent patterns:
- Type guards return `value is Type` for TypeScript narrowing
- Pure functions with no side effects
- Minimal API surface for each utility
- Comprehensive edge case handling

## Usage

### Barrel Import (Convenient)

Import multiple utilities from the main entry point:

```typescript
import { isNumber, isPositive, generateUUID } from 'tinita';
```

### Subpath Import (Optimal Tree-Shaking)

Import directly from utility paths for guaranteed minimal bundle size:

```typescript
import { generateUUID } from 'tinita/uuid/generateUUID';
import { fileSize } from 'tinita/file/fileSize';
```

**Recommendation**: Use subpath imports for production to ensure optimal bundle size regardless of bundler capabilities.

## TypeScript Support

All utilities are fully typed with TypeScript.

## Environment Support

`tinita` works in any JavaScript environment:

- ✅ Node.js (v18+)
- ✅ Browser (all modern browsers)
- ✅ Deno
- ✅ Bun
- ✅ Edge runtimes (Cloudflare Workers, Vercel Edge Functions, etc.)

## Testing

To run tests:

```bash
pnpm test
```

## Contributing

See the root [CONTRIBUTING.md](https://github.com/dunggramer/tinita/blob/main/CONTRIBUTING.md) for contribution guidelines.

## License

MIT
