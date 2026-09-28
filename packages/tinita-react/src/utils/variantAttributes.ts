/**
 * Map prop của component thành `data-*` attribute.
 *
 * Đây là cổng DUY NHẤT để một variant/state đi từ React ra DOM. Trước đây mỗi
 * component tự viết tay từng `data-*`, và không có gì bắt chúng đồng quy ước.
 *
 * Vì sao `data-*` chứ không phải chuỗi class: `variant × size × state × orientation`
 * nhân thành chuỗi class dài vô hạn, còn một thuộc tính cho mỗi chiều thì không. Và
 * state đọc được ngay trong DevTools mà không phải giải mã chuỗi class. Hướng của
 * Radix và Primer. Lý do đầy đủ ở `docs/code-standards.md`.
 */

export type VariantValue = string | number | boolean | null | undefined;

/**
 * BOOLEAN RENDER TƯỜNG MINH `'true'` / `'false'`, KHÔNG bỏ attribute khi false.
 *
 * Khác quy ước của Radix (`data-disabled` có/không). Lý do là CSS ở đây đã dựa vào
 * giá trị: `[data-indicator='false']` và `[data-show-arrow='false']` là các rule
 * thật, và bỏ attribute khi false sẽ làm chúng chết âm thầm.
 *
 * Hệ quả phải biết: `[data-indicator]` khớp CẢ HAI trạng thái. Trong CSS của
 * component luôn viết đủ giá trị - `[data-indicator='true']` hoặc
 * `[data-indicator='false']`, đừng bao giờ viết `[data-indicator]` trần cho một
 * boolean.
 *
 * `undefined` và `null` thì BỎ HẲN attribute, và đó là điều có nghĩa: "không quyết,
 * theo chủ nhà". `theme` dùng đúng cơ chế này - không truyền thì component theo
 * dark mode của host, truyền `'light'` hay `'dark'` là ép.
 *
 * Key camelCase thành kebab: `borderRadius` -> `data-border-radius`.
 */
export function variantAttributes(variants: Record<string, VariantValue>): Record<string, string> {
  const attributes: Record<string, string> = {};

  for (const [key, value] of Object.entries(variants)) {
    if (value === undefined || value === null) continue;

    const name = `data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
    attributes[name] = String(value);
  }

  return attributes;
}
