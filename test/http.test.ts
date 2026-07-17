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
    expect(ready.sources).toBe(48);
    expect(metrics).toContain("uaemcp_http_requests_total");
    expect(metrics).toContain("uaemcp_http_responses_total{outcome=\"success\"}");
    expect(metrics).toContain("uaemcp_http_request_duration_seconds_sum");
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
      version: "1.75.1",
    });
    expect(payload.result.capabilities.tools).toBeDefined();
    expect(payload.result.capabilities.resources).toBeDefined();
    expect(payload.result.capabilities.prompts).toBeDefined();
  });

  it("preserves the original tools and adds schema discovery", async () => {
    const { response, payload } = await rpc("tools/list");
    const names = payload.result.tools.map((tool: { name: string }) => tool.name);

    expect(response.status).toBe(200);
    expect(names.sort()).toEqual([
      "uae_founder_pathway",
      "uae_connectivity_pulse",
      "uae_tourism_pulse",
      "uae_employment_gender",
      "uae_policy_evidence_watch",
      "uae_products_list",
      "uae_business_setup",
      "uae_startup_support",
      "uae_education_ledger",
      "uae_evidence_dossier",
      "uae_sources_list",
      "uae_source_get",
      "uae_source_health",
      "uae_source_datasets",
      "uae_source_records",
      "uae_dataset_schema",
      "uae_dataset_snapshot", "uae_intelligence_recipe",
      "uae_search",
      "uae_source_geo",
      "uae_source_aggregate",
      "uae_market_snapshot",
      "uae_national_evidence_brief",
      "uae_dashboard_summary",
      "uae_source_add",
      "uae_source_add_metadata",
      "uae_spatial_join",
      "uae_indicator",
      "uae_entity_resolve",
      "uae_golden_residency",
      "uae_health_indicators",
      "uae_health_facilities_atlas",
      "uae_health_facilities_map",
      "uae_aeronautical_publications",
      "uae_place_names",
      "uae_observatory",
      "uae_industry_atlas",
      "uae_tax_service_activity",
      "uae_tax_service_archive",
      "uae_trade_flow_radar",
      "uae_ajman_business_evidence",
      "uae_ajman_urban_evidence",
      "uae_ajman_parks_footfall",
    ].sort());
  });

  it("publishes the public product registry through MCP", async () => {
    const { payload } = await rpc("tools/call", { name: "uae_products_list", arguments: {} });
    const body = JSON.parse(payload.result.content[0].text);
    expect(body.ok).toBe(true);
    expect(body.meta).toEqual({ total: 24, published: 24 });
    expect(body.data.map((product: { id: string }) => product.id)).toEqual([
      "employment_gender", "connectivity_pulse", "tourism_pulse", "policy_evidence_watch", "evidence_studio", "founder_pathway", "national_evidence_brief", "startup_support_navigator", "business_setup_navigator", "golden_residency_navigator", "education_ledger", "health_indicators", "health_facilities_atlas", "health_facilities_map", "aeronautical_publications", "trade_flow_radar", "ajman_business_evidence", "ajman_urban_evidence", "ajman_parks_footfall", "industry_atlas", "tax_service_activity", "fta_archive", "place_names", "open_data_observatory",
    ]);
  });

  it("publishes the product registry as addressable MCP context", async () => {
    const listed = await rpc("resources/list");
    const templates = await rpc("resources/templates/list");
    expect(listed.payload.result.resources).toHaveLength(17);
    expect(templates.payload.result.resourceTemplates).toHaveLength(2);
    expect(listed.payload.result.resources.map((resource: { uri: string }) => resource.uri)).toContain("uae://products");
    expect(listed.payload.result.resources.map((resource: { uri: string }) => resource.uri)).toContain("uae://tools");
    const toolsResource = await rpc("resources/read", { uri: "uae://tools" });
    const toolsCatalog = JSON.parse(toolsResource.payload.result.contents[0].text);
    expect(toolsCatalog.summary.total).toBe(43);
    expect(toolsCatalog.tools.some((tool: { name: string }) => tool.name === "uae_ajman_parks_footfall")).toBe(true);

    const { payload } = await rpc("resources/read", { uri: "uae://products" });
    const body = JSON.parse(payload.result.contents[0].text);
    expect(body.total).toBe(24);
    expect(body.products[0].id).toBe("employment_gender");
  });

  it("exposes the observatory through MCP without triggering upstream probes", async () => {
    const { payload } = await rpc("tools/call", { name: "uae_observatory", arguments: { action: "report" } });
    const body = JSON.parse(payload.result.content[0].text);
    expect(body.ok).toBe(true);
    expect(body.data).toMatchObject({ monitoredSources: 48, currentStatus: expect.any(Object), incidents: expect.any(Object) });
  });

  it("exposes the industrial change-monitor state without fabricating history", async () => {
    const { payload } = await rpc("tools/call", { name: "uae_industry_atlas", arguments: { action: "change" } });
    const body = JSON.parse(payload.result.content[0].text);
    expect(body.ok).toBe(true);
    expect(body.data).toMatchObject({ status: "insufficient_history", changePoints: 0, change: null });
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

  it("supports allowlisted browser clients and preflight", async () => {
    const previous = SETTINGS.allowedOrigins;
    SETTINGS.allowedOrigins = ["https://app.example"];
    try {
      const response = await createFetchHandler()(new Request("http://localhost/health", {
        method: "OPTIONS",
        headers: { origin: "https://app.example" },
      }));
      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBe("https://app.example");
    } finally {
      SETTINGS.allowedOrigins = previous;
    }
  });
});
