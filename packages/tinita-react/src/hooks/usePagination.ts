import { useCallback, useMemo, useState } from 'react';

export interface UsePaginationOptions {
  /** How many items there are in total. `0` is valid and gives `totalPages: 0`. */
  totalItems: number;
  /** Items per page. 10 by default. Clamped to at least 1. */
  pageSize?: number;
  /** Page to start on, 1-based. 1 by default. Clamped into range. */
  initialPage?: number;
}

export interface Pagination {
  /** Current page, **1-based** - the number a UI shows. Always in `[1, max(1, totalPages)]`. */
  page: number;
  pageSize: number;
  /** `Math.ceil(totalItems / pageSize)`, and `0` when there are no items. */
  totalPages: number;
  /** Slice bounds for the current page: `items.slice(firstIndex, lastIndex)`. */
  firstIndex: number;
  lastIndex: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
  /** Clamps into `[1, totalPages]`. Out-of-range and `NaN` are clamped, never thrown. */
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  /** Clamps to at least 1. The current page is re-clamped against the new page count. */
  setPageSize: (size: number) => void;
}

const clamp = (value: number, low: number, high: number): number => {
  // assert-reuse-ignore hợp đồng của hook là CLAMP, không ném: một property test
  // 2000 mẫu khoá việc NaN và Infinity đi qua được. Và đây là thân hook, chạy lại
  // mỗi render, nên §15 áp theo nghĩa mạnh hơn một vòng lặp.
  if (!Number.isFinite(value)) return low;

  return Math.min(Math.max(Math.trunc(value), low), high);
};

/**
 * Pagination state with every value derived from two pieces of state.
 *
 * Pages are **1-based**, because that is what a UI displays and an off-by-one
 * between the hook and the label is the bug this shape exists to prevent. Use
 * `firstIndex` / `lastIndex` for the array slice.
 *
 * Nothing throws. A page outside the range, a fractional page, `NaN`, a `pageSize`
 * of `0` - all clamped. Guaranteed on every render, for any inputs:
 *
 * ```
 * totalPages  === totalItems === 0 ? 0 : ceil(totalItems / pageSize)
 * page        in [1, max(1, totalPages)]
 * firstIndex  === (page - 1) * pageSize
 * lastIndex   === min(firstIndex + pageSize, totalItems)
 * canGoNext   === page < totalPages
 * canGoPrevious === page > 1
 * ```
 *
 * **Rewritten, not patched.** The version this replaced had five defects that made
 * the numbers untrustworthy:
 *
 * - It compared a **page number against an item count** in two places:
 *   `initialPage >= totalItems` and `if (currentPage > totalItems)`. With 100 items
 *   and a page size of 10 only pages 0-9 exist, but page 99 passed both checks.
 * - It kept `currentPage` in state and synced it from props with **four
 *   `useEffect`s, two of which both set it from `initialPage`** - one with a bounds
 *   check and one without. The unconditional one ran last, so changing
 *   `initialPage` bypassed the bounds entirely.
 * - It returned `setConditionCanNext` and `setConditionCanPrev`, letting the caller
 *   **overwrite the hook's own `canNext` / `canPrev`** - and `goToPage` wrote them
 *   too. Once set there was no way back to the computed value, so the flags were
 *   sometimes derived and sometimes a stale override with no way to tell which.
 * - `initialPageSize` defaulted to `1`.
 * - Its own option and return types were not exported, so a consumer could not name
 *   the value it got back.
 *
 * Page and size are now the only state; everything else is computed on render, so
 * there is nothing to fall out of sync and no effect at all.
 *
 * @example
 * ```tsx
 * const { page, totalPages, firstIndex, lastIndex, nextPage, canGoNext } =
 *   usePagination({ totalItems: users.length, pageSize: 20 });
 *
 * users.slice(firstIndex, lastIndex).map(...)
 * <button disabled={!canGoNext} onClick={nextPage}>Next</button>
 * ```
 */
export function usePagination({
  totalItems,
  pageSize: requestedPageSize = 10,
  initialPage = 1,
}: UsePaginationOptions): Pagination {
  const [requestedPage, setRequestedPage] = useState(initialPage);
  const [sizeOverride, setSizeOverride] = useState<number | null>(null);

  const pageSize = Math.max(1, Math.trunc(sizeOverride ?? requestedPageSize) || 1);
  const items = Number.isFinite(totalItems) ? Math.max(0, Math.trunc(totalItems)) : 0;
  const totalPages = items === 0 ? 0 : Math.ceil(items / pageSize);

  // Clamped on READ, not in an effect. An effect would render one frame with an
  // out-of-range page, and syncing state from props is what made the old version
  // need four of them.
  const page = clamp(requestedPage, 1, Math.max(1, totalPages));

  const firstIndex = (page - 1) * pageSize;
  const lastIndex = Math.min(firstIndex + pageSize, items);

  const goToPage = useCallback((next: number) => {
    setRequestedPage(next);
  }, []);

  const nextPage = useCallback(() => {
    setRequestedPage((current) => current + 1);
  }, []);

  const previousPage = useCallback(() => {
    setRequestedPage((current) => current - 1);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setSizeOverride(size);
  }, []);

  return useMemo(
    () => ({
      page,
      pageSize,
      totalPages,
      firstIndex,
      lastIndex,
      canGoNext: page < totalPages,
      canGoPrevious: page > 1,
      goToPage,
      nextPage,
      previousPage,
      setPageSize,
    }),
    [
      page,
      pageSize,
      totalPages,
      firstIndex,
      lastIndex,
      goToPage,
      nextPage,
      previousPage,
      setPageSize,
    ]
  );
}
