# Nguồn gốc ba bảng hằng số

Owner nhớ là "thông số chuẩn từ Chromium". Đo 2026-10-01: **đúng một nửa.**

## `constant/print_size.ts` - ĐÚNG là chuẩn, nhưng là ISO chứ không phải Chromium

`PAGE_SIZES` là **ISO 216** (dãy A, B, C) + **ISO 217** (RA, SRA) + 5 khổ Bắc Mỹ.
Chromium không ship bảng này; bản thân ISO mới là nguồn. Kiểm từng giá trị:

| Khổ         | Trong file        | Chuẩn                      | Khớp |
| ----------- | ----------------- | -------------------------- | ---- |
| `A4`        | `[210, 297]`      | ISO 216 A4 210x297 mm      | ✓    |
| `C5`        | `[162, 229]`      | ISO 269 C5 162x229 mm      | ✓    |
| `SRA3`      | `[320, 450]`      | ISO 217 SRA3 320x450 mm    | ✓    |
| `LETTER`    | `[215.9, 279.4]`  | 8.5x11 in = 215.9x279.4 mm | ✓    |
| `LEGAL`     | `[215.9, 355.6]`  | 8.5x14 in                  | ✓    |
| `TABLOID`   | `[279.4, 431.8]`  | 11x17 in                   | ✓    |
| `EXECUTIVE` | `[184.15, 266.7]` | 7.25x10.5 in               | ✓    |

51 khổ, đơn vị mm, 0 sai số. Đây là dữ liệu **tra cứu được, kiểm được, bất biến** -
đúng tiêu chí "khó gom đúng nên đáng publish".

Một khuyết điểm thật: `DEFAULT_MARGIN_PRINT = [10, 10]` không phải chuẩn nào. Nó là
lựa chọn của một app. Tách khỏi file này.

## `constant/print_type.ts` - KHÔNG phải chuẩn, và có lỗi đo được

12 khổ ảnh (`8INX10IN`, `24CMX24CM`). Không thuộc ISO, không thuộc Chromium - đây là
bảng khổ in ảnh của lab ảnh.

Lỗi thật, không chỉ là "thiếu test": **`ratio` tính trên hai cơ sở khác nhau trong
cùng một bảng.**

```
'8INX10IN'  ratio: 8 / 10        -> inch, trực tiếp
'A4'        ratio: 2480 / 3508   -> pixel @300dpi
'A3'        ratio: 3508 / 4961   -> pixel @300dpi
'14INX14IN' ratio: 1             -> hằng số viết tay
```

`A4` thật là 210/297 = 0.707071; `2480/3508` = 0.707012. Lệch 8.3e-5 - vô hại khi
hiển thị, nhưng nó chứng minh bảng được gom từ hai nguồn và không ai kiểm lại.
`14INX14IN` ghi `1` thay vì `14 / 14` là cùng một dấu hiệu.

## `constant/mime_to_extension.ts` - KHÔNG phải Chromium

139 entry. Ba entry chẩn đoán được dòng dõi:

```
'image/x-jg'       = 'art'
'application/x-aim'= 'aim'
'audio/x-mpeg'     = 'mpega'
'application/x-sv4crc' = 'sv4crc'
```

`image/x-jg` -> `art` là mime-mapping mặc định trong `conf/web.xml` của **Apache
Tomcat** (AT&T Johnson-Grace, định dạng ảnh của AOL, chết từ đầu 2000). Chromium
`net/base/mime_util.cc` không có `image/x-jg` lẫn `application/x-aim`. `sv4crc` là
System V release 4 cpio - cùng thời.

Nghĩa là bảng này là **bản sao bảng Tomcat**, vintage ~2003, không phải dữ liệu
trình duyệt. Nó thiếu những thứ hôm nay cần: `image/webp`, `image/avif`,
`font/woff2`, `application/wasm`, `video/webm`.

Hệ quả cho `fileExtensionToMIME` / `MIMEToFileExtension` / `acceptTypeToRegex`: ba
hàm đang dựa trên bảng vừa thiếu định dạng hiện đại vừa chứa định dạng đã chết.

## Khuyến nghị

| File                   | Việc                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| `print_size.ts`        | **giữ**, đổi tên `pageSizes.ts`, tách `DEFAULT_MARGIN_PRINT` ra       |
| `print_type.ts`        | **giữ nếu owner cần**, nhưng `ratio` phải tính một cơ sở, suy từ mm   |
| `mime_to_extension.ts` | **giữ bảng, thay dữ liệu**: dựng từ `mime-db` một lần, commit kết quả |

Lý do không `dependencies: mime-db`: bảng là dữ liệu tĩnh, sinh lúc build rồi commit
thì người dùng không phải tải thêm gì, và `tinita` không nhận thêm phụ thuộc runtime.

**Sources:**

- [Tomcat conf/web.xml default mime-mapping](https://github.com/refacktor/tomcat-conf/blob/master/web.xml)
