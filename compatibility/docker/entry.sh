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

mkdir -p /work
cp -r /lab/. /work/lab
# /lab/.artifacts bị copy theo -> PHẢI xoá trước, nếu không ln -s thất bại im lặng và
# container đọc manifest bản copy còn trỏ đường dẫn của host.
rm -rf /work/lab/.artifacts /work/lab/node_modules /work/lab/.reports
rm -rf /work/lab/cases/*/*/.work
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

# Yarn PnP không có node_modules: phải gọi qua `yarn node` để đi qua resolver PnP.
if [ "$PM_MODE" = "pnp" ]; then
  export LAB_NODE_RUNNER="yarn node"
fi

node /work/lab/run.mjs "$LEVEL" --no-pack
