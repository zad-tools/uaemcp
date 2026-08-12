#!/usr/bin/env bun

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { SETTINGS } from "./config.js";
import { buildServer } from "./server.js";
import type { RuntimeDependencies } from "./dependencies.js";
import { REGISTRY } from "./sources.js";
import { handleRest } from "./rest.js";
import { checkRateLimit } from "./rate-limit.js";
import { snapshotScheduler } from "./scheduler.js";
import { completionScript, doctorReport, formatDoctor, helpText, parseCli } from "./cli.js";
import { VERSION } from "./version.js";
import { healthScanScheduler } from "./health-scheduler.js";
import { policyWatchScheduler } from "./policy-watch-scheduler.js";
import { proMetering } from "./pro-metering.js";

const startedAt = Date.now();
let requestCount = 0;
let successfulResponses = 0;
let failedResponses = 0;
let requestDurationMs = 0;
let maxRequestDurationMs = 0;

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

export function createFetchHandler(dependencies: RuntimeDependencies = {}): (request: Request) => Promise<Response> {
  const dispatch = async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname.replace(/\/$/, "") || "/";

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
    // Open Emirates Pro: a valid X-API-Key rides the paid quota (no IP rate limit);
    // no key keeps today's free behavior. Unconfigured pro layer = everything free.
    let proSubject: string | null = null;
    if (!["/health", "/healthz", "/ready", "/readyz", "/metrics"].includes(path)) {
      const metering = proMetering();
      const apiKey = request.headers.get("x-api-key");
      const gate = metering ? await metering.gate(apiKey) : ({ kind: "free" } as const);
      if (gate.kind === "invalid_key") {
        return responseHeaders(request, json({
          ok: false, data: null,
          error: { code: "INVALID_KEY", message: "Unknown or malformed API key" },
          meta: {},
        }, 401));
      }
      if (gate.kind === "denied") {
        const quota = gate.reason === "limit_exceeded";
        return responseHeaders(request, json({
          ok: false, data: null,
          error: {
            code: quota ? "QUOTA_EXCEEDED" : "NO_ACTIVE_PLAN",
            message: quota
              ? "Monthly quota exhausted — upgrade or wait for the next cycle"
              : "No active Open Emirates Pro plan for this key",
          },
          meta: { used: gate.used, plans: "https://zadstack.com/agent-tasks/" },
        }, 402));
      }
      if (gate.kind === "allowed") {
        proSubject = gate.subject;
      } else {
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
    }
    const metered = (response: Response): Response => {
      if (proSubject && response.status < 400) proMetering()?.record(proSubject);
      return responseHeaders(request, response);
    };
    // Account status for the customer portal — never billed, requires a valid key.
    if (path === "/pro/usage") {
      if (!proSubject) {
        return responseHeaders(request, json({
          ok: false, data: null,
          error: { code: "INVALID_KEY", message: "A valid X-API-Key is required" }, meta: {},
        }, 401));
      }
      const metering = proMetering();
      return responseHeaders(request, json({
        ok: true,
        data: { subject: proSubject, used: metering?.usedThisMonth(proSubject) ?? 0 },
        error: null, meta: {},
      }));
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
          `# TYPE uaemcp_http_responses_total counter\n` +
          `uaemcp_http_responses_total{outcome="success"} ${successfulResponses}\n` +
          `uaemcp_http_responses_total{outcome="failure"} ${failedResponses}\n` +
          `# TYPE uaemcp_http_request_duration_seconds summary\n` +
          `uaemcp_http_request_duration_seconds_count ${successfulResponses + failedResponses}\n` +
          `uaemcp_http_request_duration_seconds_sum ${requestDurationMs / 1000}\n` +
          `# TYPE uaemcp_http_request_duration_seconds_max gauge\n` +
          `uaemcp_http_request_duration_seconds_max ${maxRequestDurationMs / 1000}\n` +
          `# TYPE uaemcp_uptime_seconds gauge\nuaemcp_uptime_seconds ${uptime}\n`,
        { headers: { "content-type": "text/plain; version=0.0.4" } },
      ));
    }
    const restResponse = await handleRest(request, dependencies);
    if (restResponse) return metered(restResponse);
    if (path !== "/mcp") return responseHeaders(request, new Response("not found", { status: 404 }));

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: request.headers.get("accept")?.includes("application/json") ?? false,
    });
    const server = buildServer(dependencies);
    await server.connect(transport);

    try {
      return metered(await transport.handleRequest(request));
    } catch (error) {
      await transport.close();
      await server.close();
      throw error;
    }
  };
  return async (request) => {
    requestCount += 1;
    const started = performance.now();
    try {
      const response = await dispatch(request);
      if (response.status >= 400) failedResponses += 1;
      else successfulResponses += 1;
      return response;
    } catch (error) {
      failedResponses += 1;
      throw error;
    } finally {
      const duration = performance.now() - started;
      requestDurationMs += duration;
      maxRequestDurationMs = Math.max(maxRequestDurationMs, duration);
    }
  };
}

export async function runStdio(): Promise<void> {
  await buildServer().connect(new StdioServerTransport());
}

export function runHttp(host = SETTINGS.host, port = SETTINGS.port, dependencies: RuntimeDependencies = {}): Bun.Server<unknown> {
  const server = Bun.serve({ hostname: host, port, fetch: createFetchHandler(dependencies) });
  snapshotScheduler.start();
  healthScanScheduler.start();
  policyWatchScheduler.start();
  process.stderr.write(`uaemcp http listening on ${server.url}mcp\n`);
  return server;
}

export async function runCli(args = Bun.argv.slice(2)): Promise<void> {
  const command = parseCli(args);
  if (command.command === "stdio") return runStdio();
  if (command.command === "http") return void runHttp(command.host ?? SETTINGS.host, command.port ?? SETTINGS.port);
  if (command.command === "help") return void process.stdout.write(`${helpText()}\n`);
  if (command.command === "version") return void process.stdout.write(`${VERSION}\n`);
  if (command.command === "completion") return void process.stdout.write(`${completionScript(command.shell)}\n`);
  const report = doctorReport();
  process.stdout.write(command.json ? `${JSON.stringify(report, null, 2)}\n` : `${formatDoctor(report)}\n`);
  if (!report.ok) process.exitCode = 1;
}

if (import.meta.main) {
  runCli().catch((error) => {
    process.stderr.write(`fatal: ${error instanceof Error ? error.stack : String(error)}\n`);
    process.exit(1);
  });
}
