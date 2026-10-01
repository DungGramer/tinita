import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import { elementToJson } from 'tinita-dom/html/elementToJson';
import { htmlToJson } from 'tinita-dom/html/htmlToJson';
import { isBlockLevelHtml } from 'tinita-dom/html/isBlockLevelHtml';
import { jsonToHtml } from 'tinita-dom/html/jsonToHtml';

/**
 * Type markup on the left and watch the tree and the serialised output change.
 *
 * Two things are worth trying, because they are the two contracts a test states but
 * cannot show you:
 *
 * - Paste `<img src=x onerror="alert(1)">`. Nothing happens. `isBlockLevelHtml` and
 *   `htmlToJson` parse with `DOMParser`, which builds an inert document; assigning
 *   the same string to `innerHTML` would start the image load, fail it, and run the
 *   handler.
 * - Paste `<p>&lt;script&gt;</p>` or text containing quotes. The round trip escapes
 *   it, because `jsonToHtml` builds real nodes and reads back `outerHTML` rather
 *   than concatenating strings.
 *
 * What it will **not** protect you from: a tree that asks for a handler.
 * `jsonToHtml` is a faithful serialiser, so editing the JSON to add an `onerror`
 * attribute produces exactly that markup. Only pass trees you produced.
 */
const SAMPLES = [
  '<select id="cars"><option value="volvo">Volvo</option></select>',
  '<p>a paragraph with <em>emphasis</em></p>',
  '<span>inline text</span>',
  '<img src=x onerror="alert(1)">',
  '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
  '<div>a<!-- dropped comment -->b</div>',
];

const box: React.CSSProperties = {
  border: '1px solid #d1d5db',
  borderRadius: 4,
  padding: 10,
  fontFamily: 'ui-monospace, monospace',
  fontSize: 12,
  whiteSpace: 'pre-wrap',
  overflowX: 'auto',
  minHeight: 80,
};

function Panel() {
  const [markup, setMarkup] = useState(SAMPLES[0]);

  const result = useMemo(() => {
    try {
      const tree = htmlToJson(markup);

      return {
        tree: JSON.stringify(tree, null, 2),
        html: jsonToHtml(tree),
        block: isBlockLevelHtml(markup),
        roundTrips: jsonToHtml(tree) === markup,
        error: null as string | null,
      };
    } catch (error) {
      return {
        tree: '',
        html: '',
        block: isBlockLevelHtml(markup),
        roundTrips: false,
        error: (error as Error).message,
      };
    }
  }, [markup]);

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 760 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SAMPLES.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => setMarkup(sample)}
            style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace' }}
          >
            {sample.length > 34 ? `${sample.slice(0, 34)}...` : sample}
          </button>
        ))}
      </div>

      <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
        HTML fragment
        <textarea
          value={markup}
          onChange={(event) => setMarkup(event.target.value)}
          rows={3}
          style={{ ...box, minHeight: 0 }}
        />
      </label>

      <p style={{ margin: 0, fontSize: 13 }}>
        <code>isBlockLevelHtml</code>: <strong>{String(result.block)}</strong>
        {'  |  '}
        round-trips byte for byte: <strong>{String(result.roundTrips)}</strong>
      </p>

      {result.error ? (
        <p style={{ ...box, color: '#b91c1c' }}>{result.error}</p>
      ) : (
        <div
          style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}
        >
          <div>
            <h4 style={{ margin: '0 0 6px', fontSize: 13 }}>
              htmlToJson &rarr; tree (via elementToJson)
            </h4>
            <pre style={box}>{result.tree}</pre>
          </div>
          <div>
            <h4 style={{ margin: '0 0 6px', fontSize: 13 }}>
              jsonToHtml &rarr; string
            </h4>
            <pre style={box}>{result.html}</pre>
          </div>
        </div>
      )}

      <details style={{ fontSize: 12 }}>
        <summary style={{ cursor: 'pointer' }}>
          elementToJson on a live element instead of a string
        </summary>
        <pre style={{ ...box, marginTop: 8 }}>
          {JSON.stringify(
            elementToJson(document.body.firstElementChild ?? document.body),
            null,
            2
          ).slice(0, 600)}
        </pre>
      </details>
    </div>
  );
}

const meta = {
  title: 'tinita-dom/HTML and JSON',
  component: Panel,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Panel>;

export default meta;

export const RoundTrip: StoryObj<typeof meta> = {};
