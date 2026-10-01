import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { downloadBlob } from 'tinita-dom/file/downloadBlob';

/**
 * Press a button and your browser decides what happens. That decision is the whole
 * reason this needs a story.
 *
 * `downloadBlob` returns `void`, and that is not laziness: nothing about the outcome
 * is observable from the page. The browser may save silently, open a dialog, or -
 * for a type it can render, like the PNG and the text file here - **display the file
 * instead of saving it**. Try all four and watch the difference. A promise would
 * have to resolve on a lie.
 *
 * The version this replaced returned the `<a>` element it had clicked, which told
 * the caller nothing at all.
 */
const SAMPLES: Array<[string, string, () => Blob]> = [
  [
    'CSV',
    'report.csv',
    () => new Blob(['name,qty\nbút,3\nsách,12\n'], { type: 'text/csv' }),
  ],
  [
    'JSON',
    'data.json',
    () =>
      new Blob([JSON.stringify({ hello: 'thế giới' }, null, 2)], {
        type: 'application/json',
      }),
  ],
  [
    'Plain text',
    'notes.txt',
    () => new Blob(['xin chào'], { type: 'text/plain' }),
  ],
  [
    'Tiny PNG',
    'dot.png',
    () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.fillText('tinita', 8, 36);
      }
      const data = atob(canvas.toDataURL('image/png').split(',')[1]);
      const bytes = Uint8Array.from(data, (character) =>
        character.charCodeAt(0)
      );

      return new Blob([bytes], { type: 'image/png' });
    },
  ],
];

function Panel() {
  const [revokeAfterMs, setRevokeAfterMs] = useState(10_000);
  const [log, setLog] = useState<string[]>([]);

  const run = (label: string, fileName: string, make: () => Blob) => {
    const blob = make();
    downloadBlob(blob, fileName, { revokeAfterMs });
    setLog((lines) =>
      [
        `${new Date().toLocaleTimeString()}  ${fileName}  ${blob.type || '(no type)'}  ${blob.size} bytes  revoke after ${revokeAfterMs}ms`,
        ...lines,
      ].slice(0, 8)
    );
    void label;
  };

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 680 }}>
      <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
        revokeAfterMs: {revokeAfterMs}
        <input
          type="range"
          min={0}
          max={30_000}
          step={500}
          value={revokeAfterMs}
          onChange={(event) => setRevokeAfterMs(Number(event.target.value))}
        />
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          A delay is needed because revoking right after <code>click()</code>{' '}
          can cancel the download before the browser has read the blob. No
          number is correct - it depends on the browser and on how long a save
          dialog stays open. Set it to 0 and open a dialog slowly to see a
          download fail.
        </span>
      </label>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SAMPLES.map(([label, fileName, make]) => (
          <button
            key={fileName}
            type="button"
            onClick={() => run(label, fileName, make)}
          >
            {label}
          </button>
        ))}
      </div>

      <pre
        style={{
          border: '1px solid #d1d5db',
          borderRadius: 4,
          padding: 10,
          fontSize: 12,
          minHeight: 80,
          margin: 0,
          whiteSpace: 'pre-wrap',
        }}
      >
        {log.length === 0 ? '(nothing yet)' : log.join('\n')}
      </pre>

      <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
        The anchor is never inserted into the document, so this leaves no trace
        in the DOM. It also only works from a user gesture - calling it from a
        timer is blocked by most browsers.
      </p>
    </div>
  );
}

const meta = {
  title: 'tinita-dom/Download blob',
  component: Panel,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Panel>;

export default meta;

export const WhatYourBrowserDecides: StoryObj<typeof meta> = {};
