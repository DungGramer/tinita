# tinita-playground

Vite + React 19 app để **kiểm `tinita-react` bằng mắt trong browser**.

```bash
cd playground
npm install      # lần đầu
npm run dev      # mở http://localhost:5180
```

## Vì sao cài từ tarball, không symlink

`package.json` trỏ `"tinita-react": "file:./tinita-react-0.1.0.tgz"`, tức bản
`npm pack` ra. Symlink vào `packages/tinita-react` sẽ kéo cả `src/` và
devDependencies vào, tức kiểm một thứ KHÁC với thứ người dùng thật nhận.

Kiểm nhanh rằng nó thật:

```bash
ls node_modules/tinita-react     # chỉ: dist  package.json  README.md
```

Sau mỗi lần sửa library:

```bash
npm run sync     # build lại + pack lại + cài đè
```

## Thứ cần nhìn

Trang chia sáu mục, mỗi mục là một thứ **cần mắt người** chứ không đo được bằng
script.

| Mục                | Nhìn gì                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 · Theme          | `.dark` đặt lên chính `<html>` - ca khó nhất, vì token light dùng `:where(:root, …)` nên specificity 0. Và hai ô `data-theme` ép sáng/tối bên trong host dark |
| 2 · Ghi đè token   | Đổi `--tnt-ring` → nền hàng đang chọn của Tree đổi theo. Đổi `--tnt-muted` → chữ mờ và icon đổi. Bảng bên dưới in màu ĐÃ RESOLVE                              |
| 3 · Tree           | Hover ra nền mờ; đóng/mở phải TRƯỢT chứ không nhảy                                                                                                            |
| 4 · FileTree       | Icon màu theo phần mở rộng, và chúng **không** đổi khi ghi đè palette                                                                                         |
| 5 · CarouselTicker | Hover để dừng. Bật "Giảm chuyển động" của hệ điều hành thì phải DỪNG HẲN                                                                                      |
| 6 · FloatingWindow | `Ctrl+M` bind cho minimize; trên Mac tooltip hiện `⌘M` và `⌘M` là phím thật sự chạy. Thu nhỏ rồi mở lại: ô nhập phải giữ nguyên chữ                           |

## Hai điều quan trọng nhất

**Không file nào trong `src/` nhập `tinita-react/styles.css`.** Mỗi entry `ui/*` tự
kéo CSS qua import graph. Kiểm:

```bash
grep -rn "^import.*styles" src/     # phải ra 0 dòng
```

Mở DevTools → Network/Elements: CSS phải có mặt mà không có `<link>` nào do bạn
viết. `vite build` ra `dist/assets/index-*.css` **20.4 kB**, không phải 27 kB của
`styles.css` đầy đủ - tức chỉ CSS của 5 component đang dùng.

**`vite.config.ts` cố ý không có `alias`, `dedupe` hay `optimizeDeps.exclude`.**
Thêm bất kỳ cái nào là playground không còn kiểm thứ người dùng thật gặp.

## Không nằm trong pnpm workspace

`pnpm-workspace.yaml` chỉ khai `packages/*`, `apps/*`, `config/*`. `playground/`
nằm ngoài có chủ ý và dùng `npm`, cùng lý do với `compatibility/`: nếu pnpm link
`tinita-react` vào đây thì nó không còn kiểm gì.
