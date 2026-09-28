import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useToggle } from '../../src/hooks/useToggle';

describe('useToggle', () => {
  it('defaults to false when nothing is passed', () => {
    const { result } = renderHook(() => useToggle({}));
    expect(result.current.value).toBe(false);
  });

  it('nhận defaultValue', () => {
    const { result } = renderHook(() => useToggle({ defaultValue: true }));
    expect(result.current.value).toBe(true);
  });

  it('toggle flips the value', () => {
    const { result } = renderHook(() => useToggle({}));
    act(() => result.current.toggle());
    expect(result.current.value).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.value).toBe(false);
  });

  it('setTrue / setFalse are idempotent', () => {
    const { result } = renderHook(() => useToggle({}));
    act(() => result.current.setTrue());
    act(() => result.current.setTrue());
    expect(result.current.value).toBe(true);
    act(() => result.current.setFalse());
    act(() => result.current.setFalse());
    expect(result.current.value).toBe(false);
  });

  it('toggle keeps its identity across renders - otherwise consumer effects re-run for nothing', () => {
    const { result, rerender } = renderHook(() => useToggle({}));
    const first = result.current.toggle;
    rerender();
    expect(result.current.toggle).toBe(first);
    act(() => result.current.toggle());
    expect(result.current.toggle).toBe(first);
  });
});
