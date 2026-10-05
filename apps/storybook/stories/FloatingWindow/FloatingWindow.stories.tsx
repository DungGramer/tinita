import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import {
  FloatingWindow,
  type FloatingWindowKeyBindings,
  type FloatingWindowMode,
  type Point,
  type WindowGeometry,
} from 'tinita-react/ui/floating-window';

/**
 * The component is controlled, so every story drives it from local state. That is
 * the point of the API: nothing is remembered unless the consumer decides to
 * remember it, and there is no store inside the package to reach into.
 */
function Demo({
  initialMode = 'windowed',
  active = true,
  title = 'Dashboard',
  body,
  keyBindings,
}: {
  initialMode?: FloatingWindowMode;
  active?: boolean;
  title?: string;
  body?: React.ReactNode;
  keyBindings?: FloatingWindowKeyBindings;
}) {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<FloatingWindowMode>(initialMode);
  const [geometry, setGeometry] = useState<WindowGeometry | undefined>();
  const [bubble, setBubble] = useState<Point | null>(null);

  return (
    <div style={{ minHeight: 520 }}>
      <button type="button" onClick={() => setOpen((v) => !v)}>
        {open ? 'Close' : 'Open'} the window
      </button>
      <p>
        Mode: <strong>{mode}</strong>
        {geometry
          ? ` - ${Math.round(geometry.width)}x${Math.round(geometry.height)} at ${Math.round(geometry.x)},${Math.round(geometry.y)}`
          : ' - geometry not set yet'}
      </p>

      <FloatingWindow
        open={open}
        onOpenChange={setOpen}
        title={title}
        mode={mode}
        onModeChange={setMode}
        geometry={geometry}
        onGeometryChange={setGeometry}
        bubblePosition={bubble}
        onBubblePositionChange={setBubble}
        active={active}
        keyBindings={keyBindings}
      >
        {body ?? (
          <div style={{ padding: 16 }}>
            <p>
              Drag the header to move. Drag the bottom-right corner to resize.
            </p>
            <p>
              Minimize collapses to an edge bubble without unmounting, so
              anything in here keeps its state. Tap the bubble to come back.
            </p>
          </div>
        )}
      </FloatingWindow>
    </div>
  );
}

const meta = {
  title: 'Tinita/FloatingWindow',
  component: FloatingWindow,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'A draggable, resizable window portalled into `document.body`, with a',
          'collapsed edge-snapping bubble. Controlled: `open`, `mode`, `geometry`',
          'and the bubble position are props, so persistence is the consumer’s',
          'choice rather than a store inside the package.',
          '',
          'Motion is CSS, so `prefers-reduced-motion` switches it off. Turn the OS',
          'setting on and the window jumps instead of easing.',
        ].join(' '),
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    mode: {
      control: 'select',
      options: ['windowed', 'maximized', 'minimized'],
      description: 'Windowed, filling the viewport, or collapsed to a bubble',
    },
    active: {
      control: 'boolean',
      description: 'False puts the focus shield over the body',
    },
    title: { control: 'text' },
  },
  // Every story drives the component from `Demo`, so `render` ignores these. They
  // are here because `StoryObj<typeof meta>` still demands the required props, and
  // a story with only `render` does not type-check without them.
  args: {
    open: true,
    onOpenChange: () => {},
    title: 'Dashboard',
    children: null,
  },
} satisfies Meta<typeof FloatingWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    // The window is portalled to document.body, so it is NOT inside canvasElement.
    // Querying the canvas finds nothing and the story passes without testing the
    // component at all - the shape of a falsely-green case.
    const page = within(canvasElement.ownerDocument.body);

    const window_ = await page.findByText('Dashboard');
    await expect(window_).toBeVisible();

    await userEvent.click(page.getByRole('button', { name: 'Minimize' }));
    await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();

    // Collapsed, not unmounted: the body is still in the DOM, which is what keeps
    // an iframe child from reloading.
    await expect(page.getByText('Dashboard')).toBeInTheDocument();
  },
};

export const Maximized: Story = {
  render: () => <Demo initialMode="maximized" />,
};

export const Minimized: Story = {
  render: () => <Demo initialMode="minimized" />,
};

/** Inactive: the focus shield covers the body until the window is raised. */
export const Inactive: Story = {
  render: () => <Demo active={false} title="Inactive window" />,
};

/**
 * The case the shields exist for. A cross-origin iframe swallows pointer events, so
 * without the pointer shield a drag dies the moment the cursor crosses the frame,
 * and without the focus shield a click inside it cannot raise the window.
 */
export const WithIframeBody: Story = {
  render: () => (
    <Demo
      title="Embedded page"
      body={
        <iframe
          title="Embedded page"
          src="https://example.com"
          style={{ border: 0, inlineSize: '100%', blockSize: '100%' }}
        />
      }
    />
  ),
};

/**
 * Keyboard shortcuts are a prop, with nothing bound by default.
 *
 * `Escape` closes, `Ctrl+M` or `Cmd+M` minimises, `F11` toggles maximise. Type into
 * the field and note that a bare letter bound to an action would be ignored there,
 * while `Escape` and anything with a modifier still fire - a bare printable key is
 * the only one that collides with typing.
 */
export const WithKeyBindings: Story = {
  render: () => (
    <Demo
      title="Keyboard"
      keyBindings={{
        close: 'Escape',
        minimize: ['Ctrl+M', 'Cmd+M'],
        maximize: 'F11',
      }}
      body={
        <div style={{ padding: 16, display: 'grid', gap: 8 }}>
          <p>Escape closes - try it from inside the field too.</p>
          <p>Ctrl+M or Cmd+M minimises. F11 toggles maximise.</p>
          <input placeholder="type here" />
        </div>
      }
    />
  ),
};
