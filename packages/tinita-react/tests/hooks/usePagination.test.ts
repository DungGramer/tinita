import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePagination } from '../../src/hooks/usePagination';

describe('usePagination', () => {
  it('is 1-based, because that is what a UI shows', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 100, pageSize: 10 }));
    expect(result.current.page).toBe(1);
    expect(result.current.firstIndex).toBe(0);
    expect(result.current.lastIndex).toBe(10);
    expect(result.current.totalPages).toBe(10);
  });

  it('CLAMPS a page against totalPages, not against totalItems', () => {
    // The version this replaced compared a page number to an item count in two
    // places, so with 100 items and a page size of 10 it accepted page 99.
    const { result } = renderHook(() => usePagination({ totalItems: 100, pageSize: 10 }));
    act(() => result.current.goToPage(99));
    expect(result.current.page).toBe(10);
    act(() => result.current.goToPage(-5));
    expect(result.current.page).toBe(1);
  });

  it('clamps initialPage too, and keeps clamping after pageSize changes', () => {
    const { result } = renderHook(() =>
      usePagination({ totalItems: 100, pageSize: 10, initialPage: 50 })
    );
    expect(result.current.page).toBe(10);

    act(() => result.current.setPageSize(50));
    expect(result.current.totalPages).toBe(2);
    expect(result.current.page).toBe(2);
  });

  it('handles an empty collection without a special case at the call site', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 0 }));
    expect(result.current.totalPages).toBe(0);
    expect(result.current.page).toBe(1);
    expect(result.current.firstIndex).toBe(0);
    expect(result.current.lastIndex).toBe(0);
    expect(result.current.canGoNext).toBe(false);
    expect(result.current.canGoPrevious).toBe(false);
  });

  it('nextPage and previousPage stop at the ends', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 25, pageSize: 10 }));
    act(() => result.current.previousPage());
    expect(result.current.page).toBe(1);

    act(() => result.current.nextPage());
    act(() => result.current.nextPage());
    act(() => result.current.nextPage());
    act(() => result.current.nextPage());
    expect(result.current.page).toBe(3);
    expect(result.current.canGoNext).toBe(false);
  });

  it('the last page is partial, and lastIndex says so', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 25, pageSize: 10 }));
    act(() => result.current.goToPage(3));
    expect(result.current.firstIndex).toBe(20);
    expect(result.current.lastIndex).toBe(25);
  });

  it('does NOT expose a way to override canGoNext', () => {
    // The version this replaced returned setConditionCanNext/setConditionCanPrev, so
    // the caller could overwrite the hook's own computed flags with no way back.
    const { result } = renderHook(() => usePagination({ totalItems: 10 }));
    expect(Object.keys(result.current).sort()).toEqual([
      'canGoNext',
      'canGoPrevious',
      'firstIndex',
      'goToPage',
      'lastIndex',
      'nextPage',
      'page',
      'pageSize',
      'previousPage',
      'setPageSize',
      'totalPages',
    ]);
  });

  it('every action is referentially stable, so it is safe in a dependency array', () => {
    const { result, rerender } = renderHook(
      ({ totalItems }: { totalItems: number }) => usePagination({ totalItems }),
      { initialProps: { totalItems: 100 } }
    );
    const before = result.current;
    rerender({ totalItems: 200 });
    expect(result.current.goToPage).toBe(before.goToPage);
    expect(result.current.nextPage).toBe(before.nextPage);
    expect(result.current.previousPage).toBe(before.previousPage);
    expect(result.current.setPageSize).toBe(before.setPageSize);
  });

  it('holds its invariants over 2000 seeded random inputs', () => {
    // xorshift, seeded: a failure reproduces instead of vanishing on re-run.
    let seed = 0x2f6a1bd;
    const next = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;

      return (seed >>> 0) / 0x100000000;
    };
    const pick = (low: number, high: number) => Math.floor(low + next() * (high - low + 1));

    for (let i = 0; i < 2000; i += 1) {
      const totalItems = pick(0, 500);
      const pageSize = pick(-2, 40);
      const initialPage = pick(-10, 60);
      const { result, unmount } = renderHook(() =>
        usePagination({ totalItems, pageSize, initialPage })
      );
      const p = result.current;
      const label = `items=${totalItems} size=${pageSize} initial=${initialPage}`;

      expect(p.pageSize, label).toBeGreaterThanOrEqual(1);
      expect(p.totalPages, label).toBe(totalItems === 0 ? 0 : Math.ceil(totalItems / p.pageSize));
      expect(p.page, label).toBeGreaterThanOrEqual(1);
      expect(p.page, label).toBeLessThanOrEqual(Math.max(1, p.totalPages));
      expect(p.firstIndex, label).toBe((p.page - 1) * p.pageSize);
      expect(p.lastIndex, label).toBe(Math.min(p.firstIndex + p.pageSize, totalItems));
      expect(p.lastIndex, label).toBeGreaterThanOrEqual(p.firstIndex);
      expect(p.canGoNext, label).toBe(p.page < p.totalPages);
      expect(p.canGoPrevious, label).toBe(p.page > 1);
      unmount();
    }
  });

  it('survives NaN and Infinity without throwing', () => {
    const { result } = renderHook(() =>
      usePagination({
        totalItems: Number.NaN,
        pageSize: Number.POSITIVE_INFINITY,
        initialPage: Number.NaN,
      })
    );
    expect(result.current.totalPages).toBe(0);
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBeGreaterThanOrEqual(1);
  });
});
