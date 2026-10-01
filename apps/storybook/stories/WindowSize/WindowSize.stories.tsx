import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import { useRefreshComponent } from 'tinita-react/hooks/useRefreshComponent';
import { useWindowSize } from 'tinita-react/hooks/useWindowSize';

/**
 * Drag the browser window and watch the render counter.
 *
 * `resize` fires on every frame while a window is dragged. The counter should climb
 * roughly in step with the frame rate and no faster, because the subscription
 * coalesces a burst with `requestAnimationFrame`. The version this replaced called
 * `setState` on each individual event - about 60 times a second for the whole drag,
 * in every component using the hook.
 *
 * The second panel is `useRefreshComponent`, which is in this story because the two
 * are easy to confuse. `useWindowSize` re-renders because something outside React
 * changed and React was told; `useRefreshComponent` re-renders because you asked it
 * to, which is almost always a sign the real data is being held where React cannot
 * see it. Its JSDoc says so at length - it is the first tool reached for when a
 * render does not happen, and reaching for it hides the cause.
 */
function SizePanel() {
  const size = useWindowSize();
  const renders = useRef(0);
  const [, setFlush] = useState(0);
  renders.current += 1;

  // Effect identity: the returned object is memoised on the snapshot, so this runs
  // only when the size actually changed - not on every render.
  const effectRuns = useRef(0);
  useEffect(() => {
    effectRuns.current += 1;
  }, [size]);

  return (
    <section style={{ display: 'grid', gap: 8 }}>
      <h4 style={{ margin: 0, fontSize: 14 }}>useWindowSize</h4>
      <p
        style={{
          margin: 0,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 14,
        }}
      >
        {size.width} x {size.height}
      </p>
      <p style={{ margin: 0, fontSize: 13 }}>
        renders: <strong>{renders.current}</strong>
        {'  |  '}
        useEffect([size]) runs: <strong>{effectRuns.current}</strong>
      </p>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
        The two numbers should stay close. If the effect count ran away from the
        render count, the hook would be returning a fresh object every render -
        the reason the snapshot is a string and the result is memoised on it.
      </p>
      <button
        type="button"
        onClick={() => setFlush((n) => n + 1)}
        style={{ justifySelf: 'start' }}
      >
        force an unrelated re-render
      </button>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
        Press it: renders go up, the effect count does not. Resize the window:
        both do.
      </p>
    </section>
  );
}

function RefreshPanel() {
  const [token, refresh] = useRefreshComponent();
  const measured = useRef<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    measured.current = box.current?.getBoundingClientRect().width ?? null;
  }, [token]);

  return (
    <section style={{ display: 'grid', gap: 8 }}>
      <h4 style={{ margin: 0, fontSize: 14 }}>useRefreshComponent</h4>
      <div
        ref={box}
        style={{
          border: '1px solid #d1d5db',
          padding: 8,
          fontSize: 13,
          resize: 'horizontal',
          overflow: 'auto',
          width: 240,
        }}
      >
        Drag my right edge, then press re-measure. Nothing in React changed, so
        only an explicit refresh picks the new width up - which is the narrow
        case this hook is for.
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 13,
        }}
      >
        token {token} - measured width{' '}
        {measured.current?.toFixed(1) ?? 'not yet'}
      </p>
      <button type="button" onClick={refresh} style={{ justifySelf: 'start' }}>
        re-measure
      </button>
    </section>
  );
}

function Panel() {
  return (
    <div style={{ display: 'grid', gap: 28, maxWidth: 680 }}>
      <SizePanel />
      <RefreshPanel />
    </div>
  );
}

const meta = {
  title: 'tinita-react/useWindowSize',
  component: Panel,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Panel>;

export default meta;

export const DragTheWindow: StoryObj<typeof meta> = {};
