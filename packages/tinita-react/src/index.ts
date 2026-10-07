// Barrel = ĐÚNG tập subpath Node-safe: mọi `hooks/*` và `utils/*`, không component nào.
//
// Trước 2026-10-07 nó re-export 3 trong 5 component (`carousel-ticker`, `file-tree`,
// `ping` - thiếu `tree` và `floating-window`) và thiếu 2 hook thêm ngày 2026-10-05.
// Không nhất quán ở cả hai phía, tức trôi dạt chứ không phải thiết kế. Và nó mâu
// thuẫn thẳng với quy tắc "dùng subpath cụ thể" trong `CLAUDE.md` - nợ #7.
//
// Bỏ 3 component ra đổi được ba thứ, cả ba đo được:
//
//   - root hết đòi `@base-ui/react` + `lucide-react`: `import { Ping } from
//     'tinita-react'` từng kéo hai optional peer mà Ping không cần.
//   - root hết là CSS-aware, nên `cssAwareSpecifiers` giờ đúng bằng `ui/*` và L1
//     `03-smoke` kiểm được root như một entry Node-safe thật.
//   - quy tắc trong `CLAUDE.md` thôi nói ngược code.
//
// Giá: breaking cho ai viết `import { Ping } from 'tinita-react'`. `0.1.0` chưa
// publish nên giá đó bằng 0 lúc này, và không bao giờ rẻ lại.
//
// Re-export từ SOURCE (`./hooks/x`), không từ subpath của chính package: self-reference
// làm declaration build phụ thuộc declaration tsup đang sinh - đo 2026-10-05,
// `TS7016: Could not find a declaration file for module 'tinita-react/...'`.

export * from './hooks/useDoubleTap';
export * from './hooks/useDragSnap';
export * from './hooks/useIsomorphicLayoutEffect';
export * from './hooks/usePagination';
export * from './hooks/useRefreshComponent';
export * from './hooks/useRequiredContext';
export * from './hooks/useToggle';
export * from './hooks/useWindowDrag';
export * from './hooks/useWindowSize';
export * from './utils/autoInjectStyles';
export * from './utils/jsxJoin';
