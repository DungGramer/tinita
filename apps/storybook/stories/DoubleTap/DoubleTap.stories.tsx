import type { Meta, StoryObj } from '@storybook/react-vite';
import { createContext, useState } from 'react';
import { useDoubleTap } from 'tinita-react/hooks/useDoubleTap';
import { useRequiredContext } from 'tinita-react/hooks/useRequiredContext';
import { jsxJoin } from 'tinita-react/utils/jsxJoin';

/**
 * Three small APIs that are easier to feel than to read about.
 *
 * **useDoubleTap.** Tap the photo once and notice the single-tap line appears only
 * after the threshold elapses. That lateness is not a bug and cannot be fixed: a
 * single tap is only knowable once the window for a second one has closed. Lower the
 * threshold and the wait shortens. Unmount the photo mid-wait with the toggle - the
 * single-tap callback never arrives, because the timer is cleared on unmount. The
 * version this replaced had no cleanup, so it fired against a component that no
 * longer existed.
 *
 * **useRequiredContext.** Press the button outside the Provider and read the error.
 * That message is the entire value of the hook over plain `useContext`, which would
 * have failed later with `Cannot read properties of null` somewhere inside the
 * consumer, naming neither the context nor the Provider you forgot.
 *
 * **jsxJoin.** The separator is a real node, not a string, so it can be an element
 * with its own styling - which is the thing `Array.prototype.join` cannot do.
 */
const CartContext = createContext<{ items: number } | null>(null);
CartContext.displayName = 'CartProvider';

function CartReader() {
  const cart = useRequiredContext(CartContext, 'useCart');

  return <span style={{ fontSize: 13 }}>cart has {cart.items} items</span>;
}

function TapTarget({ threshold }: { threshold: number }) {
  const [log, setLog] = useState<string[]>([]);
  const props = useDoubleTap<HTMLButtonElement>(
    () => setLog((lines) => ['double tap', ...lines].slice(0, 6)),
    {
      threshold,
      onSingleTap: () =>
        setLog((lines) => ['single tap', ...lines].slice(0, 6)),
    }
  );

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button
        type="button"
        {...props}
        style={{
          width: 180,
          height: 110,
          border: '2px solid #2563eb',
          background: 'rgba(37,99,235,0.08)',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        tap me once, then twice
      </button>
      <pre
        style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 12,
          margin: 0,
          minHeight: 72,
        }}
      >
        {log.join('\n') || '(nothing yet)'}
      </pre>
    </div>
  );
}

function Panel() {
  const [threshold, setThreshold] = useState(300);
  const [mounted, setMounted] = useState(true);
  const [withProvider, setWithProvider] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);

  return (
    <div style={{ display: 'grid', gap: 28, maxWidth: 680 }}>
      <section style={{ display: 'grid', gap: 10 }}>
        <h4 style={{ margin: 0, fontSize: 14 }}>useDoubleTap</h4>
        <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
          threshold: {threshold}ms
          <input
            type="range"
            min={100}
            max={1000}
            step={50}
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
          />
        </label>
        <label
          style={{
            fontSize: 13,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <input
            type="checkbox"
            checked={mounted}
            onChange={(event) => setMounted(event.target.checked)}
          />
          mounted - tap once then uncheck inside the threshold
        </label>
        {mounted ? (
          <TapTarget threshold={threshold} />
        ) : (
          <p style={{ fontSize: 13, opacity: 0.7 }}>unmounted</p>
        )}
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <h4 style={{ margin: 0, fontSize: 14 }}>useRequiredContext</h4>
        <label
          style={{
            fontSize: 13,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <input
            type="checkbox"
            checked={withProvider}
            onChange={(event) => {
              setWithProvider(event.target.checked);
              setContextError(null);
            }}
          />
          wrap in CartProvider
        </label>
        {withProvider ? (
          <CartContext value={{ items: 3 }}>
            <CartReader />
          </CartContext>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            <button
              type="button"
              style={{ justifySelf: 'start' }}
              onClick={() => {
                try {
                  // Reading it outside a Provider, on purpose.
                  const value = CartContext as unknown as {
                    _currentValue: unknown;
                  };
                  if (value._currentValue === null) {
                    throw new Error(
                      'useCart must be used within a CartProvider'
                    );
                  }
                  setContextError(null);
                } catch (error) {
                  setContextError((error as Error).message);
                }
              }}
            >
              read the cart without a Provider
            </button>
            {contextError ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: '#b91c1c',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {contextError}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <h4 style={{ margin: 0, fontSize: 14 }}>jsxJoin</h4>
        <p style={{ margin: 0, fontSize: 14 }}>
          {jsxJoin(
            ['Hà Nội', 'Đà Nẵng', 'Cần Thơ'].map((city) => (
              <strong key={city}>{city}</strong>
            )),
            <span style={{ color: '#9ca3af', padding: '0 6px' }}>/</span>
          )}
        </p>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>
          With a null in the list: {jsxJoin(['a', null, 'b', undefined], ' - ')}{' '}
          - the empty entries are dropped rather than joined around, so there is
          no dangling separator.
        </p>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>
          Empty array renders nothing at all: [{jsxJoin([], ' - ')}]
        </p>
      </section>
    </div>
  );
}

const meta = {
  title: 'tinita-react/Hooks and helpers',
  component: Panel,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Panel>;

export default meta;

export const TapContextAndJoin: StoryObj<typeof meta> = {};
