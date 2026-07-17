#!/usr/bin/env bun

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { SETTINGS } from "./config.js";
import { buildServer } from "./server.js";
import { REGISTRY } from "./sources.js";
import { handleRest } from "./rest.js";
import { checkRateLimit } from "./rate-limit.js";
import { snapshotScheduler } from "./scheduler.js";

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
  if (origin && SETTINGS.allowedOrigins.length && !SETTINGS.allowedOrigins.includes("*") && !SETTINGS.allowedOrigins.includes(origin)) {
    return json({ error: { code: "INVALID_ORIGIN", message: "Origin is not allowed" } }, 403);
  }
  return null;
}

function responseHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-request-id", request.headers.get("x-request-id") || crypto.randomUUID());
  const origin = request.headers.get("origin");
  if (origin && (SETTINGS.allowedOrigins.includes("*") || SETTINGS.allowedOrigins.includes(origin))) {
    headers.set("access-control-allow-origin", SETTINGS.allowedOrigins.includes("*") ? "*" : origin);
    headers.set("access-control-expose-headers", "mcp-session-id,mcp-protocol-version,x-request-id");
    headers.append("vary", "origin");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function createFetchHandler(): (request: Request) => Promise<Response> {
  return async (request) => {
    const path = new URL(request.url).pathname.replace(/\/$/, "") || "/";
    requestCount += 1;

    const rejection = rejectedRequest(request);
    if (rejection) return responseHeaders(request, rejection);
    if (request.method === "OPTIONS") {
      const headers = new Headers({
        "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
        "access-control-allow-headers": "content-type,accept,mcp-session-id,mcp-protocol-version,x-api-key,x-request-id",
        "access-control-max-age": "86400",
      });
      const origin = request.headers.get("origin");
      if (origin && (SETTINGS.allowedOrigins.includes("*") || SETTINGS.allowedOrigins.includes(origin))) {
        headers.set("access-control-allow-origin", SETTINGS.allowedOrigins.includes("*") ? "*" : origin);
      }
      return new Response(null, { status: 204, headers });
    }
    if (!["/health", "/healthz", "/ready", "/readyz", "/metrics"].includes(path)) {
      const rate = checkRateLimit(request);
      if (!rate.allowed) {
        return responseHeaders(request, json({
          ok: false,
          data: null,
          error: { code: "RATE_LIMITED", message: "Too many requests" },
          meta: { retryAfter: rate.retryAfter },
        }, 429));
      }
    }

    if (path === "/health" || path === "/healthz") {
      return responseHeaders(request, json({ status: "alive", runtime: "bun" }));
    }
    if (path === "/ready" || path === "/readyz") {
      return responseHeaders(request, json({ status: "ready", sources: REGISTRY.list().length }));
    }
    if (path === "/metrics") {
      const uptime = (Date.now() - startedAt) / 1000;
      return responseHeaders(request, new Response(
        `# TYPE uaemcp_http_requests_total counter\nuaemcp_http_requests_total ${requestCount}\n` +
          `# TYPE uaemcp_uptime_seconds gauge\nuaemcp_uptime_seconds ${uptime}\n`,
        { headers: { "content-type": "text/plain; version=0.0.4" } },
      ));
    }
    const restResponse = await handleRest(request);
    if (restResponse) return responseHeaders(request, restResponse);
    if (path !== "/mcp") return responseHeaders(request, new Response("not found", { status: 404 }));

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: request.headers.get("accept")?.includes("application/json") ?? false,
    });
    const server = buildServer();
    await server.connect(transport);

    try {
      return responseHeaders(request, await transport.handleRequest(request));
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
  snapshotScheduler.start();
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
