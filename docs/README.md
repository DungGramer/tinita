# Documentation Index

Cập nhật: 2026-09-24 (vòng 2) · commit 0a1dd88

---

## Tài liệu chính

| Tài liệu | Nội dung | Đọc khi |
|----------|---------|---------|
| **[project-overview-pdr.md](./project-overview-pdr.md)** | Vision dự án, roadmap, Product Development Requirements | Muốn hiểu mục tiêu + phạm vi long-term; tìm feature định tính; quy hoạch công việc mới |
| **[codebase-summary.md](./codebase-summary.md)** | Cây thư mục, số lượng files/components, dependencies, scripts, known issues | Muốn biết thực trạng hiện tại; tìm file nào; query package nào tồn tại; check status build |
| **[code-standards.md](./code-standards.md)** | Quy tắc naming, colocation pattern, CSS convention, tsup config, TypeScript setup | Viết code mới; muốn hiểu tại sao file được tổ chức kiểu này; thêm component/utility mới |
| **[system-architecture.md](./system-architecture.md)** | Workspace layout, dependency graph, build pipeline (CSS + JS), turbo task graph, known issues | Deep dive vào cách build hoạt động; diagnose lỗi build; tối ưu công việc turbo; hiểu module resolution |
| **[naming-guidelines.md](./naming-guidelines.md)** | Kebab-case directory, component folder structure, barrel export rules, identifier naming, component colocation checklist | Cần quy tắc naming chi tiết; AI codegen component; checklist khi tạo component mới |

---

## Tài liệu định hướng

Các document này mô tả **target architecture** (chưa triển khai toàn bộ):

| Tài liệu | Nội dung | Ghi chú |
|----------|---------|--------|
| **[project-roadmap.md](./project-roadmap.md)** | Định hướng phát triển, tiền đề Base UI, phạm vi 8-12 component, kiến trúc phân tầng, dependency strategy | Do project-manager viết; cập nhật cùng product goals |
| **[design-guidelines.md](./design-guidelines.md)** | Nguyên tắc design (CSS layers, prefix, token scope, customization levels), accessibility, theming, CSS rò rỉ global | Do UI/UX designer viết; hướng dẫn cho component mới |

---

## Các repo files khác (NOT trong docs/)

| File | Mục đích | Chú ý |
|------|---------|-------|
| **[README.md](../README.md)** (root) | Quick start, import examples, root scripts | Nước nước, giữ <300 dòng |
| **[ARCHITECTURE.md](../ARCHITECTURE.md)** | Architectural principles, compliance rules | Được maintain bởi architect, không touch từ docs-manager |
| **[CONTRIBUTING.md](../CONTRIBUTING.md)** | Contribution workflow, code review process | Được maintain bởi project-manager |
| **[CLAUDE.md](../CLAUDE.md)** | Development instructions cho AI assistant | Được maintain bởi user, không touch |

---

## How to Use This Documentation

1. **Lần đầu tiên** - Đọc theo thứ tự:
   - Root `README.md` (5 phút)
   - `project-overview-pdr.md` (15 phút)
   - `codebase-summary.md` (10 phút)

2. **Thêm feature mới** - Tham khảo:
   - `code-standards.md` - quy tắc cấu trúc file
   - `naming-guidelines.md` - quy tắc đặt tên
   - `design-guidelines.md` - nguyên tắc design component

3. **Debug build issue** - Xem:
   - `system-architecture.md` - phần build pipeline + known issues
   - `codebase-summary.md` - phần dependencies

4. **Long-term planning** - Check:
   - `project-overview-pdr.md` - current roadmap
   - `project-roadmap.md` - defined future roadmap

---

## Known Issues (Quick Reference)

Liệt kê đầy đủ trong `system-architecture.md`. Tóm tắt:
1. **Storybook scripts hỏng** - filter package sai scope, script name không khớp
2. **generate:exports không tồn tại** - exports maintain thủ công
3. **tsconfig base path alias** - trỏ tới package không tồn tại
4. **ESLint next preset** - export sai, chỉ khi nào dùng preset này mới phát hiện
5. **No tests** - vitest wired nhưng 0 test files hiện tại

---

## Contribution Flow

1. Read [CONTRIBUTING.md](../CONTRIBUTING.md) cho quy trình
2. Check [ARCHITECTURE.md](../ARCHITECTURE.md) cho nguyên tắc
3. Áp dụng [code-standards.md](./code-standards.md) khi viết code
4. Follow [naming-guidelines.md](./naming-guidelines.md) cho file/folder
5. Tham khảo [design-guidelines.md](./design-guidelines.md) nếu là component
