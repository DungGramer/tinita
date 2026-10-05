// Barrel. Prefer a specific subpath: this re-exports `tinita-react/ui/file-tree`,
// which pulls in `@base-ui/react` and `lucide-react` even for a consumer who only
// wanted a hook. That is the technical reason to avoid it, documented in CLAUDE.md.
//
// Re-exports from source (`./ui/x`), NOT from this package's own subpaths. A
// self-reference would make the barrel's declaration build depend on the declarations
// tsup is in the middle of generating - measured 2026-10-05:
// `TS7016: Could not find a declaration file for module 'tinita-react/ui/file-tree'`.
//
// Rollup hoists the components into shared chunks here, and those chunks inherit the
// components' CSS side-effect imports. That is harmless BECAUSE the specifiers are
// bare (`tinita-react/ui/ping/index.css`): rollup rewrites relative external paths and
// gets them wrong, but leaves bare ones alone. The consequence is the honest one - the
// barrel pulls every re-exported component's CSS, which is what a barrel means.

// Hooks
export * from './hooks/useDoubleTap';
export * from './hooks/useIsomorphicLayoutEffect';
export * from './hooks/usePagination';
export * from './hooks/useRefreshComponent';
export * from './hooks/useRequiredContext';
export * from './hooks/useToggle';
export * from './hooks/useWindowSize';

// Ui
export * from './ui/carousel-ticker';
export * from './ui/file-tree';
export * from './ui/ping';

// Utils
export * from './utils/autoInjectStyles';
export * from './utils/jsxJoin';
