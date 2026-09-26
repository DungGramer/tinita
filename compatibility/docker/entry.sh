#!/bin/sh
set -e
# /lab       : lab source, mount read-only
# /artifacts : tarball do pack.mjs tạo, mount read-only
# /work      : nơi container tự dựng consumer (tmpfs hoặc volume của container)
LEVEL="${1:-l1}"

echo "== cell: node $(node --version), PM=${PM}"
if [ "$PM" != "npm" ]; then echo "== ${PM} $(${PM} --version)"; fi

# Chứng minh container KHÔNG thấy node_modules của host
if [ -e /lab/node_modules/tinita ] || [ -e /lab/node_modules/tinita-react ]; then
  echo "FAIL: /lab/node_modules chứa tinita* - mount sai, container đang thấy monorepo" >&2
  exit 2
fi

mkdir -p /work/lab
# ĐO 2026-09-26: `cp -r /lab/.` mất 195s vì nó copy 87.815 file (~3GB) qua bind mount
# macOS<->Linux - gần hết là node_modules của lab (50M) và .work của consumer
# (cases/ = 2.7G, mỗi project Next ~500M). Loại chúng ra còn 732 file.
# Đây là chi phí thật của tier 2, KHÔNG phải `npm install` (đo được chỉ 5s).
tar -C /lab -cf - \
  --exclude='./node_modules' \
  --exclude='./.npm-cache' \
  --exclude='./.reports' \
  --exclude='./.artifacts' \
  --exclude='./.git' \
  --exclude='*/.work' \
  . | tar -C /work/lab -xf -

cp -r /artifacts/. /work/artifacts
ln -s /work/artifacts /work/lab/.artifacts

# manifest trỏ đường dẫn tuyệt đối của host -> viết lại theo đường dẫn trong container
node -e "
const fs=require('fs'),p='/work/artifacts/manifest.json';
const m=JSON.parse(fs.readFileSync(p,'utf8'));
for (const e of m.packages) e.tarball='/work/artifacts/'+e.tarball.split('/').pop();
fs.writeFileSync(p,JSON.stringify(m,null,2));
console.log('  manifest rewritten ->', m.packages.map(e=>e.tarball).join(' '));
"

cd /work/lab
npm install --no-audit --no-fund --silent >/dev/null 2>&1 || true

# WIRE 2026-09-26. `LAB_CONSUMER_PM` là thứ consumer.mjs đọc để chọn cách dựng consumer.
#
# Trước đây cell này XANH GIẢ: consumer luôn dựng bằng `npm install` nên luôn có node_modules thật,
# và cell kiểm resolution của Node thường chứ không phải PnP. Đổi `node` thành `yarn node` ở ĐÂY
# không sửa được gì - vấn đề nằm ở cổng dựng consumer.
#
# Giờ với PM=yarn ở mode pnp, consumer được dựng bằng `corepack yarn add` + `.yarnrc.yml`
# (`nodeLinker: pnp`, `pnpEnableEsmLoader: true`) + `yarn.lock` rỗng để nó là project root, và
# specifier được load qua `corepack yarn node <file>`. Ca `10-pnp-*` của L1 tự chứng minh: nó đòi
# KHÔNG có node_modules, CÓ `.pnp.cjs`, và `node` thường phải GÃY trên đúng specifier mà
# `yarn node` chạy được.
if [ "$PM" = "yarn" ] && [ "$PM_MODE" = "pnp" ]; then
  export LAB_CONSUMER_PM=yarn-pnp
  echo "== consumer sẽ dựng bằng yarn PnP (LAB_CONSUMER_PM=$LAB_CONSUMER_PM)"
fi

node /work/lab/run.mjs "$LEVEL" --no-pack
