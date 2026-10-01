import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook } from '@testing-library/react';
import { useDoubleTap } from '../../src/hooks/useDoubleTap';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const clickEvent = {} as React.MouseEvent<Element>;

describe('useDoubleTap', () => {
  it('fires the callback on the second click inside the threshold', () => {
    const onDouble = vi.fn();
    const { result } = renderHook(() => useDoubleTap(onDouble));

    act(() => {
      ('onClick' in result.current ? result.current.onClick : () => undefined)(clickEvent);
      ('onClick' in result.current ? result.current.onClick : () => undefined)(clickEvent);
    });

    expect(onDouble).toHaveBeenCalledOnce();
  });

  it('fires onSingleTap only after the threshold, never before', () => {
    const onSingle = vi.fn();
    const onDouble = vi.fn();
    const { result } = renderHook(() => useDoubleTap(onDouble, { onSingleTap: onSingle }));
    const click = 'onClick' in result.current ? result.current.onClick : () => undefined;

    act(() => click(clickEvent));
    act(() => vi.advanceTimersByTime(299));
    expect(onSingle).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onSingle).toHaveBeenCalledOnce();
    expect(onDouble).not.toHaveBeenCalled();
  });

  it('honours a custom threshold', () => {
    const onSingle = vi.fn();
    const { result } = renderHook(() =>
      useDoubleTap(vi.fn(), { onSingleTap: onSingle, threshold: 50 })
    );
    const click = 'onClick' in result.current ? result.current.onClick : () => undefined;

    act(() => click(clickEvent));
    act(() => vi.advanceTimersByTime(50));
    expect(onSingle).toHaveBeenCalledOnce();
  });

  it('CLEARS the timer on unmount, so onSingleTap cannot fire afterwards', () => {
    // The version this replaced had no cleanup, so a component unmounted inside the
    // threshold still ran onSingleTap against a component that no longer existed.
    const onSingle = vi.fn();
    const { result, unmount } = renderHook(() => useDoubleTap(vi.fn(), { onSingleTap: onSingle }));
    const click = 'onClick' in result.current ? result.current.onClick : () => undefined;

    act(() => click(clickEvent));
    unmount();
    act(() => vi.advanceTimersByTime(1000));

    expect(onSingle).not.toHaveBeenCalled();
  });

  it('returns {} when the callback is null, so the element gains no handler', () => {
    const { result } = renderHook(() => useDoubleTap(null));
    expect(result.current).toEqual({});
    expect('onClick' in result.current).toBe(false);
  });

  it('keeps a STABLE handler even with an inline options object', () => {
    // The version this replaced listed the whole options object in its useCallback
    // deps, so the ordinary inline call site defeated the memoisation on every
    // render.
    const { result, rerender } = renderHook(() =>
      useDoubleTap(() => undefined, { onSingleTap: () => undefined })
    );
    const first = 'onClick' in result.current ? result.current.onClick : null;
    rerender();
    const second = 'onClick' in result.current ? result.current.onClick : null;
    expect(second).toBe(first);
  });

  it('calls the CURRENT callback, not the one captured on the first render', () => {
    // The price of a stable handler is a latest-value ref; this is the test that the
    // ref is actually updated.
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ cb }: { cb: () => void }) => useDoubleTap(cb), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });

    const click = 'onClick' in result.current ? result.current.onClick : () => undefined;
    act(() => {
      click(clickEvent);
      click(clickEvent);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it('spreads onto a real element', () => {
    const onDouble = vi.fn();
    function Probe() {
      const props = useDoubleTap<HTMLButtonElement>(onDouble);

      return (
        <button type="button" data-testid="b" {...props}>
          tap
        </button>
      );
    }
    const { getByTestId } = render(<Probe />);
    const button = getByTestId('b');
    act(() => {
      button.click();
      button.click();
    });
    expect(onDouble).toHaveBeenCalledOnce();
  });
});
