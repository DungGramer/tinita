import { assertNonEmptyString } from 'tinita/asserts/assertNonEmptyString';

/**
 * Chèn một chuỗi CSS vào `<head>` dưới dạng `<style>`, một lần cho mỗi `styleId`.
 *
 * **Đây là đường thoát, không phải đường chính.** Đường chính là
 * `import { Ping } from 'tinita-react/ui/ping'` - entry đó tự kéo CSS qua import
 * graph, nên CSS đến lúc build, không có FOUC và không có side effect runtime.
 * Hàm này dành cho consumer mà bundler/runtime KHÔNG hiểu CSS - `ui/*` khai trong
 * `cssAwareSpecifiers` chính là để nói họ không dùng được đường chính. Họ tự lấy
 * chuỗi CSS (fetch `tinita-react/styles.css`, hoặc inline lúc build) rồi gọi hàm
 * này.
 *
 * ```ts
 * const css = await fetch('https://esm.sh/tinita-react/dist/styles.css').then((r) => r.text());
 * const remove = autoInjectStyles('tnt-design-system', css);
 * ```
 *
 * ## Chèn ở ĐẦU `<head>`, không phải cuối
 *
 * Đo trong Chromium 2026-10-06, host có `<style>.probe{color:blue}</style>` trong
 * head và CSS chèn vào đặt `.probe{color:red}`:
 *
 * ```
 * head.appendChild(style)                        -> red    lib ĐÈ host
 * head.insertBefore(style, head.firstChild)      -> blue   host đè lib
 * host thêm sheet sau lib                        -> host đè lib
 * ```
 *
 * Specificity bằng nhau nên thứ tự nguồn quyết định. Chèn cuối head làm CSS của
 * library thắng mọi stylesheet host đã khai - đúng lớp rò rỉ mà `CLAUDE.md` mục
 * "CSS: không được chạm vào trang khách" cấm, và là lý do token dùng `:where()` cho
 * specificity 0. Chèn đầu head giữ đúng quy ước: host luôn đè lại được.
 *
 * Nợ #16 của roadmap từng ghi cơ chế này "thua thứ tự nguồn". Ngược: nó THẮNG
 * stylesheet host đã có, và chỉ thua sheet host thêm vào SAU.
 *
 * ## Gọi lại cùng `styleId` thì KHÔNG làm gì
 *
 * Kể cả khi `cssContent` khác. Đây là ca HMR: module reload gọi lại, và ghi đè sẽ
 * làm một trang đang chạy nhảy style. Muốn đổi nội dung thì gọi hàm gỡ rồi chèn
 * lại - tường minh.
 *
 * SSR-safe: không có `document` thì trả về một hàm no-op, không ném.
 *
 * @returns hàm gỡ đúng thẻ vừa chèn. Cùng mẫu với `installSmoothScroll` của
 *   `tinita-dom`: caller giữ closure, không phải giữ `styleId`.
 */
export function autoInjectStyles(styleId: string, cssContent: string): () => void {
  assertNonEmptyString(styleId, 'autoInjectStyles', 'styleId');
  assertNonEmptyString(cssContent, 'autoInjectStyles', 'cssContent');

  if (typeof document === 'undefined') return () => {};

  const existing = document.getElementById(styleId);
  if (existing !== null) return () => existing.remove();

  const styleTag = document.createElement('style');
  styleTag.id = styleId;
  styleTag.textContent = cssContent;
  document.head.insertBefore(styleTag, document.head.firstChild);
  return () => styleTag.remove();
}

/**
 * Gỡ thẻ `<style>` mang `styleId`. Không có thì không làm gì.
 *
 * Giữ lại cho caller chỉ có `styleId` trong tay - ví dụ hai module khác nhau, một
 * bên chèn một bên gỡ. Có closure thì dùng giá trị trả về của `autoInjectStyles`.
 */
export function removeInjectedStyles(styleId: string): void {
  assertNonEmptyString(styleId, 'removeInjectedStyles', 'styleId');
  if (typeof document === 'undefined') return;
  document.getElementById(styleId)?.remove();
}
