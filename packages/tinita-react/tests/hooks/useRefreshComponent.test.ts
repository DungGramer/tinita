import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRefreshComponent } from '../../src/hooks/useRefreshComponent';

describe('useRefreshComponent', () => {
  it('increments the token and re-renders', () => {
    const { result } = renderHook(() => useRefreshComponent());
    expect(result.current[0]).toBe(0);

    act(() => result.current[1]());
    expect(result.current[0]).toBe(1);

    act(() => result.current[1]());
    expect(result.current[0]).toBe(2);
  });

  it('the refresh function is STABLE, so it is safe in a dependency array', () => {
    // useReducer rather than useState for exactly this.
    const { result, rerender } = renderHook(() => useRefreshComponent());
    const refresh = result.current[1];
    rerender();
    act(() => refresh());
    expect(result.current[1]).toBe(refresh);
  });

  it('a new token always differs from the previous one', () => {
    const { result } = renderHook(() => useRefreshComponent());
    const seen = new Set<number>();
    for (let i = 0; i < 20; i += 1) {
      seen.add(result.current[0]);
      act(() => result.current[1]());
    }
    expect(seen.size).toBe(20);
  });
});
