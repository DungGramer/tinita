import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  isChrome,
  isEdge,
  isFirefox,
  isIE,
  isSafari,
} from 'tinita-dom/validation/browser';
import { isCoarsePointer } from 'tinita-dom/validation/isCoarsePointer';
import { isTouchDevice } from 'tinita-dom/validation/isTouchDevice';
import {
  isAndroid,
  isIOS,
  isIOSWebView,
  isMacOS,
  isMobile,
  isWindows,
} from 'tinita-dom/validation/platform';

/**
 * The only honest way to show these: run them against the browser you are holding.
 *
 * A unit test can only assert that each function agrees with a recorded user-agent
 * string. It cannot tell you whether the answer is **right for your device** - and
 * for the user-agent group, sometimes it is not. That is the point of the two
 * columns: the measured row never rots, the guessed rows can.
 */
const MEASURED = [
  ['isCoarsePointer', isCoarsePointer, '(pointer: coarse)'],
  ['isTouchDevice', isTouchDevice, 'ontouchstart, maxTouchPoints'],
] as const;

const GUESSED = [
  ['isChrome', isChrome],
  ['isFirefox', isFirefox],
  ['isSafari', isSafari],
  ['isEdge', isEdge],
  ['isIE', isIE],
  ['isIOS', isIOS],
  ['isIOSWebView', isIOSWebView],
  ['isAndroid', isAndroid],
  ['isMobile', isMobile],
  ['isWindows', isWindows],
  ['isMacOS', isMacOS],
] as const;

const cell: React.CSSProperties = {
  padding: '6px 10px',
  borderBottom: '1px solid rgba(128,128,128,0.25)',
  fontFamily: 'ui-monospace, monospace',
  fontSize: 13,
};

function Flag({ value }: { value: boolean }) {
  return (
    <span
      style={{
        color: value ? '#15803d' : '#9ca3af',
        fontWeight: value ? 600 : 400,
      }}
    >
      {String(value)}
    </span>
  );
}

function Panel() {
  const [, setTick] = useState(0);

  return (
    <div style={{ maxWidth: 720, display: 'grid', gap: 24 }}>
      <section>
        <h3 style={{ margin: '0 0 4px', fontSize: 15 }}>
          Measured capabilities
        </h3>
        <p style={{ margin: '0 0 8px', fontSize: 13, opacity: 0.75 }}>
          Read from the browser. These stay right when a vendor changes its
          user-agent string. Resize the window or dock a mouse and press
          re-read.
        </p>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {MEASURED.map(([name, fn, source]) => (
              <tr key={name}>
                <td style={cell}>{name}</td>
                <td style={cell}>
                  <Flag value={fn()} />
                </td>
                <td style={{ ...cell, opacity: 0.6 }}>{source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3 style={{ margin: '0 0 4px', fontSize: 15 }}>User-agent guesses</h3>
        <p style={{ margin: '0 0 8px', fontSize: 13, opacity: 0.75 }}>
          Heuristics, kept as a fallback. Chrome froze its user-agent string, so
          these cannot learn about new platforms, and a user-agent is trivially
          spoofed - never use one for a security or billing decision.
        </p>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {GUESSED.map(([name, fn]) => (
              <tr key={name}>
                <td style={cell}>{name}</td>
                <td style={cell}>
                  <Flag value={fn()} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <details style={{ fontSize: 13 }}>
        <summary style={{ cursor: 'pointer' }}>Your user-agent string</summary>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.8 }}>
          {navigator.userAgent}
          {'\n'}
          vendor: {navigator.vendor || '(empty)'}
        </pre>
      </details>

      <button
        type="button"
        onClick={() => setTick((n) => n + 1)}
        style={{ justifySelf: 'start' }}
      >
        Re-read
      </button>
    </div>
  );
}

const meta = {
  title: 'tinita-dom/Device detection',
  component: Panel,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Panel>;

export default meta;

export const AgainstYourBrowser: StoryObj<typeof meta> = {};
