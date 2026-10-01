import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { getScrollbarSize } from 'tinita-dom/dimension/getScrollbarSize';

/**
 * The value depends on your operating system, and that is exactly why it needs a
 * story rather than only a test.
 *
 * macOS with overlay scrollbars reports `[0, 0]`. Windows, Linux, and macOS with
 * &ldquo;Show scroll bars: Always&rdquo; report a real gutter, usually 15 to 17
 * pixels. A unit test cannot assert a number that is correct on one machine and
 * wrong on the next - in jsdom it measures `[0, 0]` because jsdom has no layout
 * engine at all.
 *
 * The number matters when a modal hides the body scrollbar: without compensating for
 * it, the page shifts sideways as the dialog opens.
 */
function Panel() {
  const [size, setSize] = useState(() => getScrollbarSize());
  const [compensate, setCompensate] = useState(false);

  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 640 }}>
      <p
        style={{
          margin: 0,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 14,
        }}
      >
        getScrollbarSize() &rarr; [{size[0]}, {size[1]}]
      </p>
      <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>
        {size[0] === 0
          ? 'Zero: your scrollbars are overlays and take no layout space.'
          : `${size[0]}px of gutter: hiding a scrollbar here shifts the page unless you compensate.`}
      </p>

      <label
        style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}
      >
        <input
          type="checkbox"
          checked={compensate}
          onChange={(event) => setCompensate(event.target.checked)}
        />
        Hide the overflow of the box below and compensate with padding
      </label>

      <div
        style={{
          height: 120,
          border: '1px solid #d1d5db',
          overflowY: compensate ? 'hidden' : 'scroll',
          paddingRight: compensate ? size[0] : 0,
        }}
      >
        <div style={{ padding: 12, fontSize: 13 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <p key={i} style={{ margin: '0 0 8px' }}>
              Line {i + 1} - the right edge of this text should not move when
              you toggle the checkbox.
            </p>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setSize(getScrollbarSize())}
        style={{ justifySelf: 'start' }}
      >
        Re-measure
      </button>
      <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
        Re-measure after changing your OS scrollbar setting, or after moving the
        window to another display. The function reads layout, so it forces a
        synchronous reflow - call it once and cache, never in a scroll handler.
      </p>
    </div>
  );
}

const meta = {
  title: 'tinita-dom/Scrollbar size',
  component: Panel,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Panel>;

export default meta;

export const OnYourOperatingSystem: StoryObj<typeof meta> = {};
