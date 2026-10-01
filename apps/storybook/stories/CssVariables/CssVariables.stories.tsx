import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { setCssVariables } from 'tinita-dom/style/setCssVariables';

/**
 * Drag the sliders and watch the box respond. The variables are written as inline
 * style on the box, not on `document.documentElement`, which is what the second tab
 * of this story demonstrates - scope is the parameter most callers forget.
 *
 * The `null` button is the part worth trying. `setProperty(name, 'null')` would
 * store the literal string, and the box would get `--radius: null`, which CSS
 * silently ignores at use time. Passing `null` here **removes** the property, so the
 * fallback in `var(--radius, 4px)` takes over - visible immediately.
 *
 * The invalid-name button shows the other reason this is not a one-line wrapper:
 * `setProperty` ignores a malformed name without a word, so `'box shadow'` with a
 * space would look like a successful write and do nothing. It throws instead.
 */
function Panel() {
  const scoped = useRef<HTMLDivElement>(null);
  const [radius, setRadius] = useState(16);
  const [gap, setGap] = useState(12);
  const [error, setError] = useState<string | null>(null);

  const apply = (next: Record<string, string | number | null>) => {
    setError(null);
    try {
      setCssVariables(next, scoped.current ?? document.documentElement);
    } catch (thrown) {
      setError((thrown as Error).message);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 640 }}>
      <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
        --radius: {radius}px
        <input
          type="range"
          min={0}
          max={48}
          value={radius}
          onChange={(event) => {
            const value = Number(event.target.value);
            setRadius(value);
            apply({ radius: `${value}px` });
          }}
        />
      </label>

      <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
        --gap: {gap}px
        <input
          type="range"
          min={0}
          max={40}
          value={gap}
          onChange={(event) => {
            const value = Number(event.target.value);
            setGap(value);
            apply({ '--gap': `${value}px` });
          }}
        />
      </label>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => apply({ radius: null })}>
          setCssVariables({'{'} radius: null {'}'}) - removes it
        </button>
        <button
          type="button"
          onClick={() => apply({ 'box shadow': '0 0 4px red' })}
        >
          invalid name - throws instead of no-op
        </button>
      </div>

      {error ? (
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: '#b91c1c',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          {error}
        </p>
      ) : null}

      <div
        ref={scoped}
        style={{
          borderRadius: 'var(--radius, 4px)',
          padding: 'var(--gap, 8px)',
          border: '2px solid #2563eb',
          background: 'rgba(37,99,235,0.08)',
          display: 'grid',
          gap: 'var(--gap, 8px)',
          fontSize: 13,
        }}
      >
        <span>
          This box uses <code>var(--radius, 4px)</code> and{' '}
          <code>var(--gap, 8px)</code>.
        </span>
        <span style={{ opacity: 0.7, fontSize: 12 }}>
          Both keys reach the same property: the radius slider passes{' '}
          <code>radius</code> and the gap slider passes <code>--gap</code>. A
          key that already starts with <code>--</code> is not double-prefixed.
        </span>
      </div>

      <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
        The default target is <code>document.documentElement</code>, which makes
        the variables global to the page - a mutation of the host document. This
        story passes the box instead, so nothing leaks into Storybook&rsquo;s
        own styles.
      </p>
    </div>
  );
}

const meta = {
  title: 'tinita-dom/CSS variables',
  component: Panel,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Panel>;

export default meta;

export const ScopedToOneElement: StoryObj<typeof meta> = {};
