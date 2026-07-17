import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";
import { createFetchHandler } from "../src/index.js";
import { SETTINGS } from "../src/config.js";

let server: Bun.Server<unknown>;
let baseUrl: string;

beforeAll(() => {
  server = runHttp("127.0.0.1", 0);
  baseUrl = server.url.toString().replace(/\/$/, "");
});

afterAll(() => server.stop(true));

describe("Bun HTTP runtime", () => {
  const rpc = async (method: string, params: Record<string, unknown> = {}) => {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    return { response, payload: await response.json() };
  };

  it("exposes health, readiness, and metrics", async () => {
    const health = await fetch(`${baseUrl}/health`).then((response) => response.json());
    const ready = await fetch(`${baseUrl}/ready`).then((response) => response.json());
    const metrics = await fetch(`${baseUrl}/metrics`).then((response) => response.text());

    expect(health).toEqual({ status: "alive", runtime: "bun" });
    expect(ready.status).toBe("ready");
    expect(ready.sources).toBe(32);
    expect(metrics).toContain("uaemcp_http_requests_total");
  });

  it("initializes MCP and preserves the public tool contract", async () => {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "bun-contract-test", version: "1.0.0" },
        },
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.result.serverInfo).toEqual({
      name: "open-emirates-intelligence",
      version: "1.28.1",
    });
    expect(payload.result.capabilities.tools).toBeDefined();
    expect(payload.result.capabilities.resources).toBeDefined();
    expect(payload.result.capabilities.prompts).toBeDefined();
  });

  it("exposes the same 11 public tools as production", async () => {
    const { response, payload } = await rpc("tools/list");
    const names = payload.result.tools.map((tool: { name: string }) => tool.name);

    expect(response.status).toBe(200);
    expect(names.sort()).toEqual([
      "uae_sources_list",
      "uae_source_get",
      "uae_source_health",
      "uae_source_datasets",
      "uae_source_records",
      "uae_search",
      "uae_source_geo",
      "uae_source_aggregate",
      "uae_market_snapshot",
      "uae_dashboard_summary",
      "uae_source_add_metadata",
    ].sort());
  });

  it("rejects untrusted hosts when an allowlist is configured", async () => {
    const previous = SETTINGS.allowedHosts;
    SETTINGS.allowedHosts = ["uaemcp.example"];
    try {
      const response = await createFetchHandler()(new Request("http://attacker.example/health"));
      expect(response.status).toBe(421);
    } finally {
      SETTINGS.allowedHosts = previous;
    }
  });
});
