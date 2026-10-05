import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  useDragSnap,
  BUBBLE_SIZE,
  EDGE_MARGIN,
  type Point,
  type SnapSide,
} from 'tinita-react/hooks/useDragSnap';
import { useWindowSize } from 'tinita-react/hooks/useWindowSize';

/**
 * The hook behind `FloatingWindow`'s minimised bubble, on its own.
 *
 * Fully controlled: it holds the live gesture and nothing else, so the caller decides
 * where the resting position comes from and whether it is remembered. Reads no
 * `window` - the viewport arrives as an argument, which is what lets it render on a
 * server.
 */
function Demo({ remember = true }: { remember?: boolean }) {
  const { width, height } = useWindowSize();
  const viewport = { width, height };

  const [position, setPosition] = useState<Point>({ x: 200, y: 200 });
  const [side, setSide] = useState<SnapSide | null>(null);
  const [taps, setTaps] = useState(0);

  const snap = useDragSnap({
    viewport,
    position,
    // `remember: false` shows what happens when the snap result is discarded: the
    // square springs back to where it started. That is the defect the component's
    // internal fallback exists to prevent.
    onSnap: (next, snappedSide) => {
      if (remember) setPosition(next);
      setSide(snappedSide);
    },
    onTap: () => setTaps((n) => n + 1),
  });

  if (width === 0) return <p>measuring the viewport...</p>;

  return (
    <div style={{ minHeight: 420 }}>
      <p>
        Drag the square: it snaps to the nearer edge and keeps the height you
        chose. A press that never travels more than 5px counts as a tap instead.
      </p>
      <ul>
        <li>
          position: {Math.round(snap.rendered.x)}, {Math.round(snap.rendered.y)}
        </li>
        <li>dragging: {String(snap.dragging)}</li>
        <li>last snap side: {side ?? '-'}</li>
        <li>taps: {taps}</li>
        <li>
          edges at x={EDGE_MARGIN} and x={width - BUBBLE_SIZE - EDGE_MARGIN}
        </li>
      </ul>

      <div
        {...snap.handlers}
        style={{
          position: 'fixed',
          insetBlockStart: 0,
          insetInlineStart: 0,
          inlineSize: BUBBLE_SIZE,
          blockSize: BUBBLE_SIZE,
          transform: `translate(${snap.rendered.x}px, ${snap.rendered.y}px)`,
          // No transition while dragging, or the square lags the pointer by the whole
          // duration. This is what the component's `data-dragging` attribute does.
          transition: snap.dragging
            ? 'none'
            : 'transform 220ms cubic-bezier(0.22,1,0.36,1)',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 9999,
          background: 'var(--tnt-primary)',
          color: 'var(--tnt-primary-foreground)',
          cursor: snap.dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        drag
      </div>
    </div>
  );
}

const meta = {
  title: 'Tinita/useDragSnap',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Drag a small square and snap it to the nearer viewport edge on release, ' +
          'keeping its vertical position. Distinguishes a tap from a drag so the same ' +
          'element can both be repositioned and activated.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <Demo /> };

/** The snap result discarded: the square cannot be moved at all. */
export const ResultDiscarded: Story = {
  render: () => <Demo remember={false} />,
};
