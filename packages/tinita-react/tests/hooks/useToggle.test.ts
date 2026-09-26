import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useToggle } from '../../src/hooks/useToggle';

describe('useToggle', () => {
  it('mặc định false khi không truyền gì', () => {
    const { result } = renderHook(() => useToggle({}));
    expect(result.current.value).toBe(false);
  });

  it('nhận defaultValue', () => {
    const { result } = renderHook(() => useToggle({ defaultValue: true }));
    expect(result.current.value).toBe(true);
  });

  it('toggle đảo giá trị', () => {
    const { result } = renderHook(() => useToggle({}));
    act(() => result.current.toggle());
    expect(result.current.value).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.value).toBe(false);
  });

  it('setTrue / setFalse là idempotent', () => {
    const { result } = renderHook(() => useToggle({}));
    act(() => result.current.setTrue());
    act(() => result.current.setTrue());
    expect(result.current.value).toBe(true);
    act(() => result.current.setFalse());
    act(() => result.current.setFalse());
    expect(result.current.value).toBe(false);
  });

  it('toggle giữ identity qua các lần render - nếu không, effect của consumer chạy lại vô cớ', () => {
    const { result, rerender } = renderHook(() => useToggle({}));
    const first = result.current.toggle;
    rerender();
    expect(result.current.toggle).toBe(first);
    act(() => result.current.toggle());
    expect(result.current.toggle).toBe(first);
  });
});
