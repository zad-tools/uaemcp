FROM oven/bun:1.3.11-slim AS install

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3.11-slim

ENV UAEMCP_HOST=0.0.0.0 \
    UAEMCP_PORT=8080 \
    NODE_ENV=production

WORKDIR /app
COPY --from=install /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY src ./src

USER bun
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["bun", "-e", "const r=await fetch('http://127.0.0.1:8080/healthz');process.exit(r.ok?0:1)"]

CMD ["bun", "src/index.ts", "http"]
