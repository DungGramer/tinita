/**
 * `vite preview` + chromium, một chỗ.
 *
 * Tách ra vì hai bug đã trả giá sống ở đây, và nhân bản chúng nghĩa là nhân bản
 * luôn cả lần sửa:
 *
 * 1. `localhost`, KHÔNG phải `127.0.0.1`. `vite preview` bind IPv6 `::1` mà không
 *    bind IPv4. Đo 2026-09-28 trên cùng server: `[::1]:4319` -> 200,
 *    `localhost:4319` -> 200, `127.0.0.1:4319` -> 000 (connection refused). Gõ
 *    cứng IPv4 thì ca không bao giờ tới được trang.
 *
 * 2. CHỜ server sẵn sàng, không ngủ một khoảng cố định. Bản trước ngủ 4000ms rồi
 *    `goto` thẳng; `npx vite preview` trong consumer mới phải resolve binary
 *    trước và trên máy này nó vượt 4s -> `ERR_CONNECTION_REFUSED`. Vì `try` chỉ
 *    có `finally` mà không có `catch`, lỗi đó thoát ra và GIẾT cả lần chạy L2:
 *    mọi ca sau không chạy và report không được ghi. Đo 2026-09-28.
 *
 * Trả về `{ ok, value, error }` chứ không tự `add()`: phán quyết là việc của ca,
 * helper chỉ lo dựng trang. Một ca đỏ là một ca đỏ, không phải lý do bỏ phần còn
 * lại của L2 - nên lỗi được trả về, không ném ra.
 */
import { spawn } from 'node:child_process';

export async function withPreview({ work, port, probe }) {
  const url = `http://localhost:${port}/`;
  const proc = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: work, stdio: 'ignore' });
  try {
    const deadline = Date.now() + 30_000;
    let up = false;
    while (Date.now() < deadline) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(1000) });
        if (r.ok) { up = true; break; }
      } catch {
        // chưa lên, thử lại
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!up) throw new Error(`vite preview không lên sau 30s trên cổng ${port}`);
    const { chromium } = await import('playwright');
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      return { ok: true, value: await probe(page) };
    } finally {
      await browser.close();
    }
  } catch (error) {
    return { ok: false, error };
  } finally {
    proc.kill('SIGTERM');
  }
}
