import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { usePagination } from 'tinita-react/hooks/usePagination';

/**
 * Drag the inputs into nonsense and watch nothing break.
 *
 * Set `totalItems` to 0, `pageSize` to 0, `initialPage` to 500 - the panel keeps
 * showing a page in range with slice bounds that are valid to pass to
 * `Array.prototype.slice`. That is the contract, and the invariant row below is
 * recomputed live from the returned values, so you are watching it hold rather than
 * reading a promise that it does.
 *
 * The version this replaced could not survive this screen. It compared a page number
 * against an item count in two places, and it kept the page in state synced from
 * props by four `useEffect`s - two of which both wrote `currentPage` from
 * `initialPage`, one with a bounds check and one without. Changing `initialPage`
 * bypassed the bounds entirely. Everything here except `page` and `pageSize` is now
 * computed on render, so there is nothing to fall out of sync and no effect at all.
 */
const ITEMS = Array.from({ length: 500 }, (_, index) => `item ${index + 1}`);

const field: React.CSSProperties = { fontSize: 13, display: 'grid', gap: 4 };
const mono: React.CSSProperties = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: 12,
};

function Panel() {
  const [totalItems, setTotalItems] = useState(95);
  const [pageSize, setPageSize] = useState(10);
  const [initialPage, setInitialPage] = useState(1);

  const p = usePagination({ totalItems, pageSize, initialPage });

  const invariants: Array<[string, boolean]> = [
    [
      'totalPages === items === 0 ? 0 : ceil(items / pageSize)',
      p.totalPages ===
        (totalItems <= 0 ? 0 : Math.ceil(totalItems / p.pageSize)),
    ],
    [
      'page in [1, max(1, totalPages)]',
      p.page >= 1 && p.page <= Math.max(1, p.totalPages),
    ],
    [
      'firstIndex === (page - 1) * pageSize',
      p.firstIndex === (p.page - 1) * p.pageSize,
    ],
    [
      'lastIndex === min(firstIndex + pageSize, items)',
      p.lastIndex ===
        Math.min(p.firstIndex + p.pageSize, Math.max(0, totalItems)),
    ],
    ['canGoNext === page < totalPages', p.canGoNext === p.page < p.totalPages],
    ['canGoPrevious === page > 1', p.canGoPrevious === p.page > 1],
  ];

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 720 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <label style={field}>
          totalItems
          <input
            type="number"
            value={totalItems}
            onChange={(event) => setTotalItems(Number(event.target.value))}
            style={{ width: 90 }}
          />
        </label>
        <label style={field}>
          pageSize
          <input
            type="number"
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            style={{ width: 90 }}
          />
        </label>
        <label style={field}>
          initialPage
          <input
            type="number"
            value={initialPage}
            onChange={(event) => setInitialPage(Number(event.target.value))}
            style={{ width: 90 }}
          />
        </label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'end' }}>
          <button
            type="button"
            onClick={() => {
              setTotalItems(0);
              setPageSize(0);
              setInitialPage(500);
            }}
          >
            break it
          </button>
          <button
            type="button"
            onClick={() => {
              setTotalItems(95);
              setPageSize(10);
              setInitialPage(1);
            }}
          >
            reset
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          disabled={!p.canGoPrevious}
          onClick={p.previousPage}
        >
          previous
        </button>
        <span style={mono}>
          page {p.page} / {p.totalPages}
        </span>
        <button type="button" disabled={!p.canGoNext} onClick={p.nextPage}>
          next
        </button>
        <button type="button" onClick={() => p.goToPage(9999)}>
          goToPage(9999)
        </button>
        <button type="button" onClick={() => p.goToPage(-4)}>
          goToPage(-4)
        </button>
        <button type="button" onClick={() => p.setPageSize(25)}>
          setPageSize(25)
        </button>
      </div>

      <pre
        style={{
          ...mono,
          border: '1px solid #d1d5db',
          borderRadius: 4,
          padding: 10,
          margin: 0,
        }}
      >
        {JSON.stringify(
          {
            page: p.page,
            pageSize: p.pageSize,
            totalPages: p.totalPages,
            firstIndex: p.firstIndex,
            lastIndex: p.lastIndex,
            canGoNext: p.canGoNext,
            canGoPrevious: p.canGoPrevious,
          },
          null,
          2
        )}
      </pre>

      <section>
        <h4 style={{ margin: '0 0 6px', fontSize: 13 }}>
          Invariants, recomputed live
        </h4>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {invariants.map(([label, holds]) => (
              <tr key={label}>
                <td
                  style={{
                    ...mono,
                    padding: '4px 8px',
                    borderBottom: '1px solid rgba(128,128,128,0.2)',
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    padding: '4px 8px',
                    borderBottom: '1px solid rgba(128,128,128,0.2)',
                    color: holds ? '#15803d' : '#b91c1c',
                    fontWeight: 600,
                  }}
                >
                  {holds ? 'holds' : 'BROKEN'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h4 style={{ margin: '0 0 6px', fontSize: 13 }}>
          items.slice({p.firstIndex}, {p.lastIndex})
        </h4>
        <div style={{ ...mono, opacity: 0.8 }}>
          {ITEMS.slice(0, Math.max(0, totalItems))
            .slice(p.firstIndex, p.lastIndex)
            .join(', ') || '(empty page)'}
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: 'tinita-react/usePagination',
  component: Panel,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Panel>;

export default meta;

export const TryToBreakIt: StoryObj<typeof meta> = {};
