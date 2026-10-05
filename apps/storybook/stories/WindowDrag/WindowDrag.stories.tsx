import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  useWindowDrag,
  MIN_HEIGHT,
  MIN_WIDTH,
  type WindowGeometry,
} from 'tinita-react/hooks/useWindowDrag';
import { useWindowSize } from 'tinita-react/hooks/useWindowSize';

/**
 * The hook behind `FloatingWindow`'s move and resize, on its own.
 *
 * Geometry is local while a gesture runs, for frame-rate feedback, and committed to
 * the caller exactly once on release - not on every pointer move, which would hand a
 * consumer sixty updates a second and, if they persist it, sixty writes to storage
 * per drag.
 */
function Demo() {
  const { width, height } = useWindowSize();
  const viewport = { width, height };

  const [geometry, setGeometry] = useState<WindowGeometry>({
    x: 40,
    y: 40,
    width: 420,
    height: 280,
  });
  const [commits, setCommits] = useState(0);

  const drag = useWindowDrag({
    geometry,
    viewport,
    onGeometryChange: (next) => {
      setGeometry(next);
      setCommits((n) => n + 1);
    },
  });

  if (width === 0) return <p>measuring the viewport...</p>;

  return (
    <div style={{ minHeight: 420 }}>
      <p>
        Drag the bar to move, drag the bottom-right corner to resize. The size
        floor is {MIN_WIDTH}x{MIN_HEIGHT}, and a window can never be dragged far
        enough down to put its own drag bar out of reach.
      </p>
      <ul>
        <li>
          live: {Math.round(drag.box.width)}x{Math.round(drag.box.height)} at{' '}
          {Math.round(drag.box.x)}, {Math.round(drag.box.y)}
        </li>
        <li>interacting: {String(drag.interacting)}</li>
        <li>committed to the caller: {commits} time(s)</li>
      </ul>

      <div
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerCancel}
        style={{
          position: 'fixed',
          insetBlockStart: 0,
          insetInlineStart: 0,
          transform: `translate(${drag.box.x}px, ${drag.box.y}px)`,
          inlineSize: drag.box.width,
          blockSize: drag.box.height,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--tnt-border)',
          borderRadius: 'var(--tnt-radius-lg)',
          background: 'var(--tnt-background)',
          color: 'var(--tnt-foreground)',
          touchAction: 'none',
        }}
      >
        <div
          onPointerDown={drag.onHeaderPointerDown}
          style={{
            flexShrink: 0,
            blockSize: 36,
            display: 'flex',
            alignItems: 'center',
            paddingInline: 12,
            borderBlockEnd: '1px solid var(--tnt-border)',
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          drag me
        </div>
        <div style={{ flex: 1, padding: 12 }}>
          {/* The shield the component applies for the same reason: a cross-origin
              iframe here would swallow the pointer and kill the gesture. */}
          <div style={{ pointerEvents: drag.interacting ? 'none' : 'auto' }}>
            body content
          </div>
        </div>
        <div
          onPointerDown={drag.onResizePointerDown}
          style={{
            position: 'absolute',
            insetBlockEnd: 0,
            insetInlineEnd: 0,
            inlineSize: 16,
            blockSize: 16,
            cursor: 'nwse-resize',
          }}
        />
      </div>
    </div>
  );
}

const meta = {
  title: 'Tinita/useWindowDrag',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Move and resize a box with the pointer. Commits geometry once per gesture, ' +
          'on release, and clamps so the drag handle always stays reachable.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <Demo /> };
