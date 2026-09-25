# Bun là RUNTIME khác, không chỉ package manager khác. Cell này advisory: fail của nó
# không làm đỏ tier 2, vì lỗi ở đây chưa chắc là lỗi của package.
FROM oven/bun:1-slim
ENV PM=bun
ENV PM_VERSION=1
WORKDIR /lab
COPY entry.sh /usr/local/bin/entry.sh
RUN chmod +x /usr/local/bin/entry.sh
ENTRYPOINT ["/usr/local/bin/entry.sh"]
