#!/usr/bin/env bun

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { SETTINGS } from "./config.js";
import { buildServer } from "./server.js";
import { REGISTRY } from "./sources.js";
import { handleRest } from "./rest.js";

const startedAt = Date.now();
let requestCount = 0;

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function rejectedRequest(request: Request): Response | null {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  if (SETTINGS.allowedHosts.length && !SETTINGS.allowedHosts.includes(host) && !SETTINGS.allowedHosts.includes(url.hostname)) {
    return json({ error: { code: "INVALID_HOST", message: "Host is not allowed" } }, 421);
  }
  const origin = request.headers.get("origin");
  if (origin && SETTINGS.allowedOrigins.length && !SETTINGS.allowedOrigins.includes(origin)) {
    return json({ error: { code: "INVALID_ORIGIN", message: "Origin is not allowed" } }, 403);
  }
  return null;
}

export function createFetchHandler(): (request: Request) => Promise<Response> {
  return async (request) => {
    const path = new URL(request.url).pathname.replace(/\/$/, "") || "/";
    requestCount += 1;

    const rejection = rejectedRequest(request);
    if (rejection) return rejection;

    if (path === "/health" || path === "/healthz") {
      return json({ status: "alive", runtime: "bun" });
    }
    if (path === "/ready" || path === "/readyz") {
      return json({ status: "ready", sources: REGISTRY.list().length });
    }
    if (path === "/metrics") {
      const uptime = (Date.now() - startedAt) / 1000;
      return new Response(
        `# TYPE uaemcp_http_requests_total counter\nuaemcp_http_requests_total ${requestCount}\n` +
          `# TYPE uaemcp_uptime_seconds gauge\nuaemcp_uptime_seconds ${uptime}\n`,
        { headers: { "content-type": "text/plain; version=0.0.4" } },
      );
    }
    const restResponse = await handleRest(request);
    if (restResponse) return restResponse;
    if (path !== "/mcp") return new Response("not found", { status: 404 });

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: request.headers.get("accept")?.includes("application/json") ?? false,
    });
    const server = buildServer();
    await server.connect(transport);

    try {
      return await transport.handleRequest(request);
    } catch (error) {
      await transport.close();
      await server.close();
      throw error;
    }
  };
}

export async function runStdio(): Promise<void> {
  await buildServer().connect(new StdioServerTransport());
}

export function runHttp(host = SETTINGS.host, port = SETTINGS.port): Bun.Server<unknown> {
  const server = Bun.serve({ hostname: host, port, fetch: createFetchHandler() });
  process.stderr.write(`uaemcp http listening on ${server.url}mcp\n`);
  return server;
}

async function main(args = Bun.argv.slice(2)): Promise<void> {
  const mode = args[0] && !args[0].startsWith("-") ? args[0] : "stdio";
  if (mode === "stdio") return runStdio();
  if (mode === "http") {
    const hostIndex = args.indexOf("--host");
    const portIndex = args.indexOf("--port");
    const host = hostIndex >= 0 ? args[hostIndex + 1] : SETTINGS.host;
    const port = portIndex >= 0 ? Number(args[portIndex + 1]) : SETTINGS.port;
    if (!host || !Number.isInteger(port) || port <= 0 || port > 65_535) {
      throw new Error("invalid --host or --port");
    }
    runHttp(host, port);
    return;
  }
  throw new Error(`unknown mode: ${mode}\nusage: uaemcp [stdio|http]`);
}

if (import.meta.main) {
  main().catch((error) => {
    process.stderr.write(`fatal: ${error instanceof Error ? error.stack : String(error)}\n`);
    process.exit(1);
  });
}
