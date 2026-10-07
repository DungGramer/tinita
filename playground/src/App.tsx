/*
 * KHÔNG có `import 'tinita-react/styles.css'` ở file này hay bất kỳ file nào trong
 * playground. Đó là điểm cần kiểm: mỗi entry `ui/*` tự kéo CSS của nó qua import
 * graph, nên component phải hiện đúng mà không nhập stylesheet nào.
 *
 * Phép kiểm: `grep -rn "^import.*styles" src/` phải trả về 0 dòng. (Dò chuỗi
 * "styles.css" trần sẽ khớp chính comment này.)
 */
import { CarouselTicker } from 'tinita-react/ui/carousel-ticker';
import { FileTree } from 'tinita-react/ui/file-tree';
import { FloatingWindow } from 'tinita-react/ui/floating-window';
import { Ping } from 'tinita-react/ui/ping';
import { Tree, type TreeNode } from 'tinita-react/ui/tree';
import { useEffect, useState } from 'react';

/** Sáu token semantic mà component dẫn xuất từ, cộng cái chúng dẫn ra. */
const OVERRIDES = [
  { token: '--tnt-background', label: 'nền', fallback: '#ffffff' },
  { token: '--tnt-foreground', label: 'chữ', fallback: '#1a1a1a' },
  { token: '--tnt-muted', label: 'chữ mờ / icon', fallback: '#6b7280' },
  { token: '--tnt-ring', label: 'focus + nền hàng chọn', fallback: '#2563eb' },
  { token: '--tnt-border', label: 'viền', fallback: '#e5e7eb' },
] as const;

const DERIVED = [
  ['--tnt-tree-bg', '--tnt-background'],
  ['--tnt-tree-text', '--tnt-foreground'],
  ['--tnt-tree-text-dim', '--tnt-muted'],
  ['--tnt-tree-icon', '--tnt-muted'],
  ['--tnt-tree-selected-text', '--tnt-foreground'],
  ['--tnt-tree-hover', '--tnt-accent'],
  ['--tnt-tree-selected-bg', '--tnt-ring (12% / 18%)'],
  ['--tnt-floating-window-border-idle', '--tnt-border (60%)'],
] as const;

const NODES: TreeNode[] = [
  {
    id: 'app',
    name: 'app',
    children: [
      { id: 'app/layout.tsx', name: 'layout.tsx' },
      { id: 'app/page.tsx', name: 'page.tsx' },
      {
        id: 'app/ui',
        name: 'ui',
        children: [
          { id: 'app/ui/button.tsx', name: 'button.tsx' },
          { id: 'app/ui/card.tsx', name: 'card.tsx' },
        ],
      },
    ],
  },
  { id: 'README.md', name: 'README.md' },
];

const TREE_TEXT = [
  'src/',
  '  index.ts',
  '  components/',
  '    Button.tsx',
  '    Button.stories.tsx',
  '  styles/',
  '    tokens.css',
  'package.json',
  'README.md',
].join('\n');

/**
 * Đọc MÀU ĐÃ RESOLVE của một token.
 *
 * Đọc qua `color: var(--token)` chứ không đọc thẳng custom property: giá trị computed
 * của custom property là TEXT, nên `rgb(0 0 0 / 0.06)` và `rgba(0, 0, 0, 0.06)` khác
 * chuỗi mà cùng màu. Và `color-mix()` serialize ra `color(srgb ...)`.
 */
function useResolvedTokens(deps: unknown[]): Record<string, string> {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    document.body.appendChild(probe);
    const next: Record<string, string> = {};
    for (const [token] of DERIVED) {
      probe.style.color = '';
      probe.style.color = `var(${token})`;
      next[token] = getComputedStyle(probe).color;
    }
    document.body.removeChild(probe);
    setValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return values;
}

export function App() {
  const [dark, setDark] = useState(false);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [fwOpen, setFwOpen] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(
    'app/ui/card.tsx'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    const root = document.documentElement;
    for (const { token } of OVERRIDES) {
      if (custom[token]) root.style.setProperty(token, custom[token]);
      else root.style.removeProperty(token);
    }
  }, [custom]);

  const resolved = useResolvedTokens([dark, custom]);

  return (
    <div className="pg-wrap">
      <h1 className="pg-h1">tinita-react playground</h1>
      <p className="pg-sub">
        Cài từ <code>tinita-react-0.1.0.tgz</code> đã pack, không symlink
        workspace. Không file nào ở đây nhập{' '}
        <code>tinita-react/styles.css</code>.
      </p>

      <section className="pg-card">
        <h2>1 · Theme</h2>
        <div className="pg-row">
          <button
            type="button"
            className="pg-btn"
            data-on={String(dark)}
            onClick={() => setDark((v) => !v)}
          >
            {dark ? 'dark (.dark trên <html>)' : 'light'}
          </button>
          <span className="pg-note" style={{ margin: 0 }}>
            `.dark` đặt lên chính <code>&lt;html&gt;</code> - ca khó nhất, vì
            token light dùng
            <code> :where(:root, …)</code> để specificity 0.
          </span>
        </div>
        <div className="pg-box pg-row" style={{ marginTop: 12 }}>
          <span className="pg-note" style={{ margin: 0 }}>
            Ép sáng bên trong host dark:
          </span>
          <div data-theme="light" style={{ padding: 8, borderRadius: 8 }}>
            <Ping count={7} prefix="forced light" />
          </div>
          <div data-theme="dark" style={{ padding: 8, borderRadius: 8 }}>
            <Ping count={7} prefix="forced dark" />
          </div>
        </div>
      </section>

      <section className="pg-card">
        <h2>2 · Ghi đè token semantic → component đổi theo</h2>
        <div className="pg-grid">
          {OVERRIDES.map(({ token, label, fallback }) => (
            <label key={token} className="pg-swatch">
              <input
                type="color"
                value={custom[token] ?? fallback}
                onChange={(e) =>
                  setCustom((c) => ({ ...c, [token]: e.target.value }))
                }
              />
              <span>
                <code>{token}</code>
                <br />
                <span style={{ color: 'var(--pg-dim)' }}>{label}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="pg-row" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="pg-btn"
            onClick={() => setCustom({})}
          >
            trả về mặc định
          </button>
        </div>
        <p className="pg-note">
          Trước 2026-10-06 các token này đổi mà không component nào đổi - giá
          trị của component là literal tính tay. Bảng dưới là màu ĐÃ RESOLVE,
          đọc qua <code>color: var(--token)</code>.
        </p>
        <table className="pg-table" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>token của component</th>
              <th>dẫn xuất từ</th>
              <th>màu resolve</th>
            </tr>
          </thead>
          <tbody>
            {DERIVED.map(([token, from]) => (
              <tr key={token}>
                <td>{token}</td>
                <td style={{ color: 'var(--pg-dim)' }}>{from}</td>
                <td>
                  <span
                    className="pg-chip"
                    style={{ background: resolved[token] }}
                  />{' '}
                  {resolved[token] ?? '…'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="pg-card">
        <h2>3 · Tree — primitive, nhận dữ liệu</h2>
        <Tree
          nodes={NODES}
          selected={selected}
          onSelectedChange={(node) => setSelected(node.id)}
        />
        <p className="pg-note">
          Hover một hàng để thấy <code>--tnt-tree-hover</code>; hàng đang chọn
          dùng
          <code> --tnt-tree-selected-bg</code>, pha từ <code>--tnt-ring</code>{' '}
          qua
          <code> color-mix()</code>. Mũi tên đóng/mở phải TRƯỢT, không nhảy - đó
          là transition trên
          <code> height</code>, và nó cần <code>--tnt-duration-fast</code> giải
          được.
        </p>
      </section>

      <section className="pg-card">
        <h2>4 · FileTree — adapter, đọc chuỗi cây</h2>
        <FileTree text={TREE_TEXT} />
        <p className="pg-note">
          Icon màu theo phần mở rộng. 38/40 màu icon cố ý KHÔNG dẫn xuất từ
          palette: chúng là màu nhận dạng loại file, đổi <code>--tnt-ring</code>{' '}
          không được làm icon JS đổi màu.
        </p>
      </section>

      <section className="pg-card">
        <h2>5 · CarouselTicker</h2>
        <div style={{ maxWidth: 420 }}>
          <CarouselTicker pauseOnHover fade>
            <span style={{ padding: '0 12px' }}>alpha</span>
            <span style={{ padding: '0 12px' }}>beta</span>
            <span style={{ padding: '0 12px' }}>gamma</span>
            <span style={{ padding: '0 12px' }}>delta</span>
          </CarouselTicker>
        </div>
        <p className="pg-note">
          Hover để dừng. Bật “Giảm chuyển động” của hệ điều hành thì nó phải
          DỪNG HẲN, không phải chạy nhanh hơn.
        </p>
      </section>

      <section className="pg-card">
        <h2>6 · FloatingWindow</h2>
        <div className="pg-row">
          <button
            type="button"
            className="pg-btn"
            data-on={String(fwOpen)}
            onClick={() => setFwOpen((v) => !v)}
          >
            {fwOpen ? 'đóng' : 'mở'} cửa sổ
          </button>
        </div>
        <p className="pg-note">
          Phím tắt bind <code>Ctrl+M</code> cho minimize. Trên Mac nó TỰ ĐỔI
          thành <code>⌘M</code> - cả tooltip lẫn phím thật sự chạy. Hover vào
          nút minimize để thấy nhãn. Kéo header để di chuyển, kéo góc dưới-phải
          để resize, thu nhỏ rồi kéo bubble.
        </p>
        <FloatingWindow
          open={fwOpen}
          onOpenChange={setFwOpen}
          title="Bảng điều khiển"
          keyBindings={{ close: 'Escape', minimize: 'Ctrl+M', maximize: 'F11' }}
        >
          <div style={{ padding: 16 }}>
            <p style={{ marginTop: 0 }}>
              Thu nhỏ KHÔNG unmount: ô nhập dưới đây phải giữ nguyên chữ sau khi
              thu nhỏ rồi mở lại.
            </p>
            <input
              className="pg-btn"
              placeholder="gõ gì đó rồi thu nhỏ"
              style={{ inlineSize: '100%' }}
            />
          </div>
        </FloatingWindow>
      </section>
    </div>
  );
}
