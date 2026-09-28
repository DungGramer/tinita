import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import { installSmoothScroll } from 'tinita-dom/smooth-scroll';

/**
 * `installSmoothScroll` is not a component - it installs listeners on `document`
 * and returns an uninstall function. The story reproduces real usage: call it ONCE
 * and uninstall on unmount. StrictMode runs effects twice, so failing to uninstall
 * means installing twice.
 */
function Demo({ enabled }: { enabled: boolean }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    return installSmoothScroll();
  }, [enabled]);

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
        Scroll with a mouse wheel inside the frame below. A trackpad takes the
        native path; a stepped mouse wheel gets eased -{' '}
        <code>classifyWheelSource</code> decides, and that decision is locked
        trong suốt một gesture.
      </p>
      <p style={{ margin: 0, fontSize: 13 }}>
        <strong>installSmoothScroll:</strong>{' '}
        {enabled ? 'installed' : 'uninstalled'}
        {' · '}
        <strong>prefers-reduced-motion:</strong>{' '}
        {reduced ? 'reduce' : 'no-preference'}
        {reduced && ' → easing is dropped entirely, not merely sped up'}
      </p>
      <div
        ref={boxRef}
        data-smooth-scroll-demo
        style={{
          height: 260,
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: 12,
        }}
      >
        {Array.from({ length: 40 }, (_, i) => (
          <div
            key={i}
            style={{ padding: '10px 4px', borderBottom: '1px solid #f0f0f0' }}
          >
            Row {i + 1}
          </div>
        ))}
      </div>
      <div
        data-no-smooth-scroll
        style={{
          height: 140,
          overflowY: 'auto',
          border: '1px dashed #bbb',
          borderRadius: 8,
          padding: 12,
        }}
      >
        <p style={{ margin: '0 0 8px', fontSize: 12 }}>
          This frame carries <code>data-no-smooth-scroll</code>, so it always
          scrolls natively, even while installed.
        </p>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} style={{ padding: '8px 4px' }}>
            Row {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

const meta = {
  title: 'tinita-dom/installSmoothScroll',
  component: Demo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          "Smooth scrolling for stepped mouse wheels, leaving trackpads native. Browser-only with no SSR guard - calling it on the server is the caller's mistake.",
      },
    },
  },
  argTypes: {
    enabled: {
      control: 'boolean',
      description: 'Install or uninstall the listeners',
    },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Installed: Story = { args: { enabled: true } };
export const NotInstalled: Story = { args: { enabled: false } };
