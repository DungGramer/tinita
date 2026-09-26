/**
 * Ambient type cho CSS Modules.
 *
 * `Readonly<Record<string, string>>` - không phải key chính xác. Sinh key chính xác
 * cần một tool generate `.d.ts` từ CSS, tức machinery và một lớp bug staleness mới.
 * Mức an toàn ngang với viết chuỗi class trực tiếp như trước: `styles.roott` không bị
 * bắt, `'tnt-ping__boddy'` cũng không. Không mất gì so với hiện tại.
 */
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
