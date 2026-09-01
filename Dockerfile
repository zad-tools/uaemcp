FROM oven/bun:1.4.0-slim AS install

WORKDIR /app
COPY package.json bun.lock ./
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/sdk/package.json ./packages/sdk/package.json
COPY packages/mcp/package.json ./packages/mcp/package.json
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.4.0-slim

ENV UAEMCP_HOST=0.0.0.0 \
    UAEMCP_PORT=8080 \
    NODE_ENV=production

WORKDIR /app
COPY --from=install /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY src ./src

RUN mkdir -p /app/data && chown bun:bun /app/data

USER bun
VOLUME ["/app/data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["bun", "-e", "const r=await fetch('http://127.0.0.1:8080/healthz');process.exit(r.ok?0:1)"]

CMD ["bun", "src/index.ts", "http"]
