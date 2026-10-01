---
title: Docker Layer Sharing & Mount Risk Analysis
date: 2026-09-25
---

## Q1: Mount host node_modules (darwin-arm64) → Linux container

**Kết luận: BẤT KHẢ THI. Native binaries gãy ngay.**

Vấn đề: `node_modules` trên macOS arm64 chứa:

- `esbuild` + `@esbuild/darwin-arm64` (Mach-O binaries)
- `playwright` browser (darwin-specific)
- `@rollup/rollup-darwin-arm64`
- `node.bcrypt.js`, `sqlite3` (compiled native modules)

Container Linux arm64 không chạy darwin/Mach-O binaries. Lỗi điển hình: `error: command not found: /work/node_modules/.bin/esbuild` hoặc "cannot execute binary file: Exec format error".

**Cơ chế (từ Docker docs):** Khi mount host volume, nội dung được pass as-is. Không có re-compilation.

**Giải pháp:** Dùng **named volume cho node_modules** (không mount từ host):

```dockerfile
VOLUME ["/app/node_modules"]
# Hoặc: RUN npm ci (build-time, cache layer)
```

Host mount chỉ dùng cho source code: `mount /lab:/work/lab,readonly`

Source: [node.bcrypt.js issue #917](https://github.com/kelektiv/node.bcrypt.js/issues/917), [Oneuptime Docker on Apple Silicon](https://oneuptime.com/blog/post/2026-01-16-docker-mac-apple-silicon/view)

---

## Q2: Chia sẻ layer Docker giữa các cell (Node 24/22/20)

**Kết luận: Layer base không chia sẻ được. Chi phí thật là `npm install`, không phải `docker build`.**

Base images khác nhau (`node:24-slim`, `node:22-slim`, `node:20-slim`) → SHA256 hash khác → layer cache miss, không tái dùng.

Multi-stage build vẫn không giúp vì mỗi stage khác base.

**Chi phí thực tế:** 2284s ÷ 4 cell ≈ 570s/cell

- `docker build` (base image pull + setup): ~50-100s
- `npm install` (entry.sh runtime): ~300-400s ← ĐÂY là chi phí chính

**Chiến lược:** Cắt `npm install` đó đi bằng cách move vào Dockerfile (Q4).

Source: [Docker Layer Caching in CI/CD](https://oneuptime.com/blog/post/2026-01-16-docker-layer-caching-cicd/view)

---

## Q3: BuildKit cache mount cho npm

**Kết luận: CÓ. Cú pháp & điều kiện bật:**

```dockerfile
# Enable BuildKit: DOCKER_BUILDKIT=1 docker build ...
RUN --mount=type=cache,id=tinita-npm,target=/root/.npm \
    npm ci
```

**Giữ cache giữa builds?**

- ✅ Same image base: YES (Docker lưu cache trên host)
- ✅ Different base (node:24 vs node:22): **CÓ**, cache ID riêng biệt (`id=tinita-npm`) nên tái dùng được, **nhưng file lock khác → npm fetch package khác → cache hit rate thấp**
- ❌ Không cache native binaries được (esbuild, playwright) → lần đầu vẫn phải compile/download 2-3 phút

**Enable BuildKit:**

```bash
export DOCKER_BUILDKIT=1
docker build -t tinita:test .
```

GitHub Actions: enable mặc định, GitHub runner có persistent BuildKit cache.

Source: [Persist BuildKit Package Cache Mounts in GitHub Actions](https://oneuptime.com/blog/post/2026-09-14-persist-buildkit-package-cache-mounts-github-actions/view), [BuildKit Cache Mounts](https://stackharbor.com/en/knowledge-base/docker-buildkit-cache-mounts/)

---

## Q4: `npm install` ở BUILD TIME thay vì runtime ← CẮT LỚNHẤT

**Kết luận: PHẢI LÀM. Này là ~15-20 phút / cell.**

Hiện tại: `entry.sh` chạy `npm install` **mỗi lần `docker run`** → mất caching, tuần tự, không validate lock file.

**Cách mới:**

```dockerfile
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=tinita-npm,target=/root/.npm npm ci
COPY --chown=node:node . .
```

**Layer cache trigger:**

- Nếu `package-lock.json` không đổi → layer cached (0s)
- Nếu thay package → npm fetch + compile native → 100-150s (lần đầu)

**Cạm bẫy:**

- ⚠️ `playwright install` cần `--with-deps` ngoài npm (thêm 20-30s, thường bỏ qua ở headless CI)
- Image size: +500MB (node_modules), chấp nhận được

**Giảm thời gian / cell:**

- Hiện: 300-400s (npm install runtime)
- Sau move to RUN: ~150s (first build), 0s (cache hit)
- **Tiết kiệm ~250s/cell = 1000s total (16 phút) nếu lock file stable**

Source: [Docker Caching Strategies with npm ci](https://dev.to/sohanaakbar7/docker-caching-strategies-that-actually-work-with-npm-ci-4ja4), [Baeldung Dockerfile npm caching](https://www.baeldung.com/ops/dockerfile-npm-install-cache)

---

## Q5: Đo timing Docker

**Cách 1: Shell `time`**

```bash
time docker build -t tinita:test .     # docker build duration
time docker run --rm tinita:test sh -c "npm install"  # runtime install (nếu còn)
```

**Cách 2: BuildKit output (chi tiết nhất)**

```bash
DOCKER_BUILDKIT=1 docker build --progress=plain .
# Output: [stage name] RUN npm ci  250.3s
```

**Cách 3: Per-step với flag**

```bash
docker build --no-cache -v -t tinita:test .  # -v = verbose, show each layer time
```

**Cách 4: Python script (parse docker build JSON)**

```python
import subprocess
result = subprocess.run(
    ["docker", "build", "-t", "test", "."],
    capture_output=True, text=True
)
# Parse --progress=plain output, regex r'\[.*\] RUN.* (\d+)\.(\d+)s'
```

**Đo chính xác trên lab:**

```bash
for i in {1..3}; do
  echo "=== Run $i ==="
  time docker build --progress=plain -t lab:$i . 2>&1 | grep 'npm ci'
done
```

Sau cắt `npm install` từ runtime → build-time, measure lại đạt tiêu chí <20 phút không.

Source: Docker official [Build cache optimization](https://docs.docker.com/build/cache/)

---

## Hành động tiếp theo

1. **Bác bỏ node_modules mounting** → move để named volume
2. **Move `npm ci` vào Dockerfile** (RUN command) → layer cache
3. **Enable BuildKit** → cache mount cho tất cả 4 cell
4. **Expect: ~15 phút** (từ 38 phút), lock file stable → near-zero rebuild
