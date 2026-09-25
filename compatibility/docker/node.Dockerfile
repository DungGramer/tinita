# Container CHỈ có Node + package manager. Không cài gì thừa - mục tiêu là môi trường sạch,
# không có node_modules của monorepo, không hoisting, không cache của máy dev.
# -slim (Debian glibc) chứ KHÔNG alpine: musl gây rủi ro với esbuild/native dep.
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim

ARG PM=npm
ARG PM_VERSION=latest
ENV PM=${PM}
ENV PM_VERSION=${PM_VERSION}

# corepack cài pnpm/yarn đúng version. npm đã có sẵn trong image.
RUN if [ "$PM" != "npm" ]; then corepack enable && corepack prepare "${PM}@${PM_VERSION}" --activate; fi

WORKDIR /lab
COPY entry.sh /usr/local/bin/entry.sh
RUN chmod +x /usr/local/bin/entry.sh
ENTRYPOINT ["/usr/local/bin/entry.sh"]
