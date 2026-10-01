# typesVersions cho Subpath Exports

**Ngày:** 2026-09-25 | **Chủ đề:** TypeScript typesVersions support cho moduleResolution: node

---

## 1. Hình dạng typesVersions cho 6 Subpath

**Câu trả lời:** Dùng wildcard pattern `"*"` với subpath mapping. Một single pattern wildcard `"*": ["dist/*"]` CÓ THỂ cover tất cả subpath - không cần liệt kê từng cái.

**JSON cụ thể cho tinita:**
```json
{
  "typesVersions": {
    "*": {
      "*": ["dist/*.d.ts", "dist/*/index.d.ts"]
    }
  }
}
```

Cách này:
- `tinita` → `dist/index.d.ts`
- `tinita/file/fileSize` → `dist/file/fileSize.d.ts`
- Tất cả 6 subpath được cover bởi 1 pattern

**Chi tiết:** TypeScript đọc `typesVersions` theo phiên bản (key là semver range, ví dụ `">=3.1"`). Với `"*"` nghĩa là tất cả version. Pattern `"*"` trong value match bất kì import path nào. Thứ tự key quan trọng nếu có overlap - key đầu tiên match được dùng. [typescript.org handbook](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)

---

## 2. typesVersions CÓ THẬT Giải Quyết moduleResolution: node?

**Câu trả lời: CÓ - đó là GIẢI PHÁP DUY NHẤT cho node10.**

**Chứng cứ:**
- `moduleResolution: node` (node10) không nhận diện `exports` field - nó bỏ qua hoàn toàn
- Không có real folder ở root cho subpath → resolution fail
- TypeScript ĐỌC `typesVersions` ngay cả khi `exports` present (nếu exports không có type path)
- Kết quả: Consumer trên node10 sẽ resolve `tinita/file/fileSize` → `dist/file/fileSize.d.ts` qua typesVersions

**Nhưng:** typesVersions CHỈ giải quyết type resolution, KHÔNG giải quyết runtime. Runtime fail là do Node.js không hiểu subpath export - cần real file hoặc symlink. [Search result: github.com/oaverify](https://github.com/oaverify/oaverify/issues/1163)

---

## 3. exports vs typesVersions: Tương Tác

**Câu trả lời:** Từ TypeScript 5.0 (PR #50890), `exports` CÓ PRIORITY. Khi `exports` present, nó BLOCK non-exports keys kể cả typesVersions.

**Chi tiết quan trọng:**
- **Với `moduleResolution: node16/nodenext/bundler`**: TS dùng `exports.types` hoặc `exports["."].types` - **KHÔNG dùng typesVersions**
- **Với `moduleResolution: node`**: TS KHÔNG thấy `exports` field, nên dùng typesVersions nếu có
- **Kết luận:** Thêm typesVersions an toàn - consumer mới (node16+) không bị ảnh hưởng, consumer cũ (node10) được giải cứu

**Lưu ý:** Nếu dùng conditional exports như `"types@<4.8": "old-types.d.ts"`, thì phải dùng syntax này TRONG `exports`, không dùng riêng `typesVersions`. Đó là recommended approach nhưng phức tạp hơn. [PR #50890](https://github.com/microsoft/TypeScript/pull/50890)

---

## 4. attw (Are The Types Wrong) Và node10

**Câu trả lời: CÓ - attw sẽ ngừng báo `node10: Resolution failed` khi thêm typesVersions.**

**Chứng cứ:**
- attw có check riêng cho node10 resolution, nó đọc `typesVersions` để validate
- Multiple repos (otplib, linked-fw/translation, etc.) đã fix node10 failures bằng cách thêm typesVersions
- attw báo pass khi typesVersions map chính xác → `node10` resolution OK

**Example:** PR yeojz/otplib#885 thêm typesVersions → attw pass node10 check. [PR #885 otplib](https://github.com/yeojz/otplib/pull/885)

---

## 5. Chi Phí Bảo Trì & Cạm Bẫy

**Cạm bẫy chính:**

| Cạm bẫy | Hậu quả | Phòng chống |
|---------|---------|-----------|
| typesVersions không sync với exports | Subpath mới export nhưng typesVersions chưa add → node10 consumer fail | Tự động update cả exports + typesVersions cùng lúc; script generator nếu có |
| Thứ tự key typesVersions | Key đầu tiên match được dùng; nếu overlap pattern, key sau bị bỏ | Để `"*"` cuối cùng, specifics trước. Ít khi có overlap nên thường không vấn đề |
| Double wildcard `"*/*"` | TypeScript không resolve chính xác nested wildcard [Issue #47952](https://github.com/microsoft/TypeScript/issues/47952) | Dùng explicit array `["dist/*", "dist/*/index.d.ts"]` thay vì `"*/*"` |
| `.d.mts` vs `.d.ts` cho node10 | node10 không hiểu `.mts` suffix - cần `.d.ts` | typesVersions luôn point đến `.d.ts` riêng, không dùng `.d.mts` cho fallback |

**Tự động hóa:** Chưa có tool chính thức từ TypeScript. Có thể viết script Node.js parse `exports` → generate `typesVersions` JSON. tsdown (Rolldown) có issue #252 đề nghị feature này cho build tool.

---

## Kết Luận Thực Hành

✅ **Thêm typesVersions an toàn**: Không break consumer mới, cứu consumer node10  
✅ **Pattern dùng được:** `"typesVersions": { "*": { "*": ["dist/*.d.ts", "dist/*/index.d.ts"] } }`  
✅ **attw sẽ pass:** node10 resolution thành công  
⚠️ **Maintenance:** Phải update typesVersions khi thêm subpath export. Không có auto-sync.  
❌ **Runtime không được fix**: typesVersions chỉ fix type resolution, không giải quyết Node.js runtime subpath lookup

---

## Sources

- [TypeScript Handbook: Publishing](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)
- [TypeScript Handbook: Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- [PR #50890: exports priority over typesVersions](https://github.com/microsoft/TypeScript/pull/50890)
- [Issue #1163: oaverify - moduleResolution requirement](https://github.com/oaverify/oaverify/issues/1163)
- [PR #885 otplib: attw node10 fix with typesVersions](https://github.com/yeojz/otplib/pull/885)
- [GitHub: example-subpath-exports-ts-compat](https://github.com/andrewbranch/example-subpath-exports-ts-compat)
- [Issue #47952: wildcard limitations](https://github.com/microsoft/TypeScript/issues/47952)
