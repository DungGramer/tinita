# Image Playwright chính thức - đã có Chromium và font. Baseline ảnh PHẢI sinh trong đây:
# font rendering và antialiasing của macOS khác Linux, baseline sinh trên host sẽ đỏ toàn bộ
# vì lý do không liên quan tới library.
FROM mcr.microsoft.com/playwright:v1.56.1-noble
WORKDIR /lab
COPY entry.sh /usr/local/bin/entry.sh
RUN chmod +x /usr/local/bin/entry.sh
ENV PM=npm
ENV PM_VERSION=latest
ENV IN_PLAYWRIGHT_CONTAINER=1
ENTRYPOINT ["/usr/local/bin/entry.sh"]
