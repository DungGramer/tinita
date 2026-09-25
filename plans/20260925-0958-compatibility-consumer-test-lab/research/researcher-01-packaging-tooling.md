# Package Validation Tooling for Compatibility Test Lab

**Date:** 2026-09-25 | **Research Focus:** publint, @arethetypeswrong/cli, verdaccio, Yarn PnP, Node images

## 1. Package Artifact Validators

### publint
**Bắt được gì:** Linting packages cho compatibility across Vite, Webpack, Rollup, Node.js. Validates package.json fields (exports, main, module, types) against actual dist files. Chạy được trên tarball (npm pack).

**Không bắt được:** Syntax errors, extensionless ESM imports (attw catches this).

**Lệnh:** `publint --strict` (CI-ready), `npx publint ./path` (local). Exit code support: có - documented cho CI gates.

**Kết luận:** ✅ Nên dùng - phát hiện mismatches exports/dist, foundation của lab.

### @arethetypeswrong/cli (attw)
**Bắt được gì:** TypeScript type resolution issues - ESM declarations for CJS consumers, conditional exports mismatches, declaration extensionless imports ("./relative" không ".d.ts").

**Không bắt được:** Runtime export mismatches (publint catches).

**Lệnh:** `npx @arethetypeswrong/cli ./package` hoặc `npm pack` → `npx @arethetypeswrong/cli ./package.tgz`. Tarball mode: yes, CI-ready exit codes.

**Kết luận:** ✅ Nên dùng - bắt TypeScript-specific bugs, complementary với publint.

## 2. Local npm Registry

### verdaccio vs npm pack
**Verdaccio bắt thêm được:** Registry resolution (version, dist-tag, peer resolution via registry metadata), offline mode, caching behavior.

**npm pack không bắt:** Version resolution, peer dep registry validation - chỉ install local tarball.

**Setup:** `npm install -g verdaccio`, `verdaccio` (default :4873), `npm set registry http://localhost:4873`. Docker: ✅ `verdaccio/verdaccio:latest-alpine` hoặc image build từ Dockerfile.

**Kết luận:** ✅ Dùng verdaccio cho full registry simulation. npm pack chỉ đủ cho local validation. Verdaccio bắt version metadata errors npm pack bỏ qua.

## 3. Optional peerDependencies Testing
**Tool/pattern chính thức:** Không tìm thấy tool dedicated. Standard: install package 3 lần: (a) peer present, (b) peer absent, (c) older peer version.

**npm/pnpm/yarn khác:** npm - warn only, pnpm - strict (fail install if missing, unless optional), Yarn - similar pnpm.

**Kết luận:** ⚠️ Manual test matrix per-manager (3 scenarios × 3 managers = 9 runs). Docker + script tự đơn giản hơn finding missing tool.

## 4. Yarn PnP
**Lỗi nó bắt mà npm/pnpm bỏ qua:** Phantom dependencies (code uses dep not in package.json). Yarn PnP validates mỗi import đi qua resolver - dependencies must be declared.

**Tại sao mạnh nhất:** npm dùng flatten (phantom deps work), pnpm dùng symlink structure (strict nhưng bỏ qua resolution timing issues). Yarn PnP runtime validation catches edge cases cả hai bỏ sót.

**Kết luận:** ✅ Thêm Yarn PnP nếu detect phantom deps là yêu cầu. Không bắt buộc nếu chỉ muốn npm/pnpm.

## 5. Node Version Matrix
**Official images:** `node:18-slim` (standard, 200MB), `node:18-alpine` (musl libc, 150MB, risky cho esbuild).

**Cạm bẫy alpine:** esbuild/native deps - musl != glibc, breakage nếu package giả sử glibc. Khuyên dùng `-slim` (Debian, glibc).

**Kết luận:** ✅ `node:18-slim`, `node:20-slim`, `node:22-slim` cho test matrix. Alpine chỉ nếu explicitly tested.

---

## Khuyến Nghị Cho Lab

1. **Validators:** publint + @arethetypeswrong/cli chạy trên tarball (`npm pack`)
2. **Registry:** verdaccio cho full simulation, không cần verdaccio nếu chỉ local
3. **Peer testing:** manual 3×3 matrix, Docker per-scenario
4. **PnP:** skip initial version, add later nếu phantom deps là issue
5. **Node images:** slim variants, 3-4 LTS versions

**Status:** Tất cả tools là existing solutions - không cần custom machinery.

Sources:
- [publint npm](https://www.npmjs.com/package/publint)
- [publint vs attw comparison](https://www.pkgpulse.com/guides/publint-vs-arethetypeswrong-vs-pkg-pr-new-package-quality-2026)
- [Verdaccio GitHub](https://github.com/verdaccio/verdaccio)
- [Yarn PnP comparison 2026](https://www.syncfusion.com/blogs/post/pnpm-vs-npm-vs-yarn)
