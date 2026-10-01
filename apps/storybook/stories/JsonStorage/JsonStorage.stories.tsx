import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { cookieJar } from 'tinita-dom/storage/cookieJar';
import { createJsonStore } from 'tinita-dom/storage/createJsonStore';
import { localStorageJson } from 'tinita-dom/storage/localStorageJson';
import { sessionStorageJson } from 'tinita-dom/storage/sessionStorageJson';

/**
 * Write a value, then reload the page.
 *
 * `localStorageJson` survives. `sessionStorageJson` survives a reload but not a new
 * tab. `cookieJar` survives and is also sent to the server with every request - which
 * is why the cookie row is the wrong place for anything private. No test tells you
 * that difference; reloading does.
 *
 * Two contracts to try that are easy to get wrong:
 *
 * - Press **write junk** to put `not json` straight into the key with the raw
 *   `localStorage` API, then read. You get the fallback, not an exception. The
 *   version this replaced called `JSON.parse` with no `try`, so a value another
 *   library wrote on the same key made the read throw - in the one function whose
 *   `fallback` parameter promised otherwise.
 * - Put a `;` in the cookie value. Everything stays intact. Without
 *   `encodeURIComponent` that character ends the cookie and takes the rest of the
 *   jar with it.
 */
const row: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid rgba(128,128,128,0.25)',
  fontSize: 13,
};
const mono: React.CSSProperties = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: 12,
};

/** A fourth store over a Map, to show `createJsonStore` takes any Storage-shaped thing. */
const inMemory = (() => {
  const map = new Map<string, string>();

  return createJsonStore(
    () =>
      ({
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => void map.set(key, value),
        removeItem: (key: string) => void map.delete(key),
        clear: () => map.clear(),
      }) as unknown as Storage
  );
})();

function Panel() {
  const [value, setValue] = useState('hello; world = ok');
  const [, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const KEY = 'tinita-story';
  const stores = [
    ['localStorageJson', localStorageJson, 'survives a reload and a new tab'],
    [
      'sessionStorageJson',
      sessionStorageJson,
      'survives a reload, not a new tab',
    ],
    [
      'createJsonStore (in-memory)',
      inMemory,
      'gone on reload - any Storage shape works',
    ],
  ] as const;

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 720 }}>
      <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
        Value to store
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          style={{ ...mono, padding: 6 }}
        />
      </label>

      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {stores.map(([name, store, note]) => (
            <tr key={name}>
              <td style={row}>
                <div>{name}</div>
                <div style={{ opacity: 0.65, fontSize: 11 }}>{note}</div>
              </td>
              <td style={{ ...row, ...mono }}>
                {JSON.stringify(store.get(KEY, null))}
              </td>
              <td style={row}>
                <button
                  type="button"
                  onClick={() => {
                    store.set(KEY, value);
                    refresh();
                  }}
                >
                  write
                </button>{' '}
                <button
                  type="button"
                  onClick={() => {
                    store.remove(KEY);
                    refresh();
                  }}
                >
                  remove
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td style={row}>
              <div>cookieJar</div>
              <div style={{ opacity: 0.65, fontSize: 11 }}>
                survives, and is sent to the server every request
              </div>
            </td>
            <td style={{ ...row, ...mono }}>
              {JSON.stringify(cookieJar.get(KEY))}
            </td>
            <td style={row}>
              <button
                type="button"
                onClick={() => {
                  cookieJar.set(KEY, value, { maxAge: 300 });
                  refresh();
                }}
              >
                write
              </button>{' '}
              <button
                type="button"
                onClick={() => {
                  cookieJar.remove(KEY);
                  refresh();
                }}
              >
                remove
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(KEY, 'not json');
            refresh();
          }}
        >
          write junk into localStorage directly
        </button>
        <button type="button" onClick={() => location.reload()}>
          reload the page
        </button>
      </div>

      <details style={{ fontSize: 12 }}>
        <summary style={{ cursor: 'pointer' }}>
          Every cookie this page can read
        </summary>
        <pre style={{ ...mono, marginTop: 8 }}>
          {cookieJar.entries().length === 0
            ? '(none)'
            : cookieJar
                .entries()
                .map(([k, v]) => `${k} = ${v}`)
                .join('\n')}
        </pre>
        <p style={{ opacity: 0.7 }}>
          There is no <code>clear()</code>: HttpOnly cookies are invisible from
          here, and one set on another path or domain cannot be deleted without
          knowing that exact pair. A clear that removes some and silently leaves
          others is worse than none.
        </p>
      </details>
    </div>
  );
}

const meta = {
  title: 'tinita-dom/JSON storage',
  component: Panel,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Panel>;

export default meta;

export const ReloadToSeeTheDifference: StoryObj<typeof meta> = {};
