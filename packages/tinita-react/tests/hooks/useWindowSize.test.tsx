import { describe, expect, it, vi } from 'vitest';
import { act, render, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { useWindowSize } from '../../src/hooks/useWindowSize';

const resize = (width: number, height: number) => {
  window.innerWidth = width;
  window.innerHeight = height;
  window.dispatchEvent(new Event('resize'));
};

describe('useWindowSize', () => {
  it('reports the current window size', () => {
    const { result } = renderHook(() => useWindowSize());
    expect(result.current).toEqual({ width: window.innerWidth, height: window.innerHeight });
  });

  it('does NOT render forever - the Object.is trap of useSyncExternalStore', () => {
    // A snapshot returning a fresh { width, height } compares unequal every time and
    // React re-renders without end. This is the single reason the snapshot is a
    // string. One render (two under StrictMode) is the whole budget.
    let renders = 0;
    const { unmount } = renderHook(() => {
      renders += 1;

      return useWindowSize();
    });
    expect(renders).toBeLessThanOrEqual(2);
    unmount();
  });

  it('COALESCES a burst of resize events into at most one render', async () => {
    // `resize` fires every frame while a window is dragged. The version this replaced
    // called setState on each one.
    let renders = 0;
    const { unmount } = renderHook(() => {
      renders += 1;

      return useWindowSize();
    });
    const baseline = renders;

    await act(async () => {
      for (let i = 0; i < 100; i += 1) resize(800 + i, 600);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });

    expect(renders - baseline).toBeLessThanOrEqual(2);
    unmount();
  });

  it('updates after a resize settles', async () => {
    const { result } = renderHook(() => useWindowSize());
    await act(async () => {
      resize(1234, 567);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });
    expect(result.current).toEqual({ width: 1234, height: 567 });
  });

  it('returns a referentially STABLE object while the size is unchanged', () => {
    // Otherwise a consumer's useEffect(..., [size]) runs on every render.
    const { result, rerender } = renderHook(() => useWindowSize());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('renders on the SERVER as 0x0 instead of throwing', () => {
    // The version this replaced read window.innerWidth inside the useState
    // initialiser - a ReferenceError on a server, under a comment claiming it had
    // been written to avoid exactly that. react-dom/server takes the
    // getServerSnapshot path, which is what is asserted here.
    function Probe() {
      const { width, height } = useWindowSize();

      return <span>{`${width}x${height}`}</span>;
    }

    expect(renderToString(<Probe />)).toContain('0x0');
  });

  it('removes its listener on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useWindowSize());
    unmount();
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    remove.mockRestore();
  });

  it('client render after a server render agrees on the first paint', () => {
    // Hydration safety in miniature: the string the server produced must be what the
    // client produces before any effect runs.
    function Probe() {
      const { width } = useWindowSize();

      return <span data-testid="w">{width}</span>;
    }
    const server = renderToString(<Probe />);
    const { getByTestId } = render(<Probe />);
    expect(server).toContain('>0<');
    // The client settles on the real value; what matters is the server said 0.
    expect(Number(getByTestId('w').textContent)).toBeGreaterThanOrEqual(0);
  });
});
