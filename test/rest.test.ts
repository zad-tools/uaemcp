import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";

let server: Bun.Server<unknown>;
let baseUrl: string;

beforeAll(() => {
  server = runHttp("127.0.0.1", 0);
  baseUrl = server.url.toString().replace(/\/$/, "");
});

afterAll(() => server.stop(true));

describe("REST v1", () => {
  it("serves a useful landing page", async () => {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("Open Emirates Intelligence");
    expect(html).toContain('id="productLedger"');
    expect(html).toContain("/api/v1/products");
    expect(html).toContain('<strong>30</strong><span data-en="Focused tools');
    const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
    expect(script).toBeDefined();
    expect(() => new Function(script ?? "")).not.toThrow();
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
  });

  it("serves the bilingual FTA service activity interface", async () => {
    const response = await fetch(`${baseUrl}/tax-services`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("UAE Tax Service Activity");
    expect(html).toContain("نشاط خدمات الضرائب في الإمارات");
    expect(html).toContain("/api/v1/tax-services");
    expect(html).toContain("not revenue");
  });

  it("serves the bilingual source-native FTA archive explorer", async () => {
    const response = await fetch(`${baseUrl}/tax-services/archive`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("FTA Archive Explorer");
    expect(html).toContain("/api/v1/tax-services/archive");
    expect(html).toContain("comparison-status");
    expect(html).toContain('id="lang"');
  });

  it("serves the bilingual UAE Trade Flow Radar", async () => {
    const response = await fetch(`${baseUrl}/trade-flow`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("UAE Trade Flow Radar");
    expect(html).toContain("/api/v1/trade-flow");
    expect(html).toContain("رادار حركة التجارة");
    expect(html).toContain('id="lang"');
  });

  it("serves the public Open Data Observatory interface", async () => {
    const response = await fetch(`${baseUrl}/observatory`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("Emirates Open Data Observatory");
    expect(html).toContain("/api/v1/observatory");
  });

  it("serves the bilingual UAE Industry Atlas interface", async () => {
    const response = await fetch(`${baseUrl}/industry-atlas`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("UAE Industry Atlas");
    expect(html).toContain("أطلس الصناعة في الإمارات");
    expect(html).toContain("/api/v1/industry-atlas");
    expect(html).toContain("/api/v1/industry-atlas/change");
    expect(html).toContain("Industrial Change Monitor");
    expect(html).toContain("مراقب التغير الصناعي");
  });

  it("serves the bilingual official UAE Place Names Explorer", async () => {
    const response = await fetch(`${baseUrl}/places`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("UAE Place Names Explorer");
    expect(html).toContain("مستكشف أسماء الأماكن في الإمارات");
    expect(html).toContain("/api/v1/places");
    expect(html).toContain("Federal Geographic Information Center");
  });

  it("publishes an honest industrial change-monitor state", async () => {
    const response = await fetch(`${baseUrl}/api/v1/industry-atlas/change`);
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({ status: "insufficient_history", changePoints: 0, change: null });
    expect(payload.meta).toMatchObject({ source_id: "moiat_industrial_licenses", snapshot_policy: "changed_content_only" });
  });

  it("serves the SDK-generating OpenAPI contract", async () => {
    const response = await fetch(`${baseUrl}/openapi.json`);
    const document = await response.json();
    expect(response.status).toBe(200);
    expect(document).toMatchObject({ openapi: "3.1.0", info: { version: "1.61.1" } });
    expect(document.paths["/api/v1/founder-pathway"].post.operationId).toBe("buildFounderPathway");
  });

  it("lists sources using the stable envelope", async () => {
    const response = await fetch(`${baseUrl}/api/v1/sources`);
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data).toHaveLength(40);
    expect(payload.meta.total).toBe(40);
  });

  it("returns structured errors", async () => {
    const response = await fetch(`${baseUrl}/api/v1/sources/not-real`);
    const payload = await response.json();
    expect(response.status).toBe(404);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("NOT_FOUND");
  });

  it("supports bilingual catalog search", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=عجمان`);
    const payload = await response.json();
    expect(payload.data.sources[0].source_id).toBe("ajman_data_portal");
  });

  it("keeps writes disabled without a token", async () => {
    const response = await fetch(`${baseUrl}/api/v1/sources`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(401);
  });

  it("publishes conservative coverage and unified catalog models", async () => {
    const coverage = await fetch(`${baseUrl}/api/v1/coverage`).then((response) => response.json());
    const catalog = await fetch(`${baseUrl}/api/v1/catalog`).then((response) => response.json());
    expect(coverage.data.liveRecordConnectors).toBe(8);
    expect(catalog.data[0].type).toBe("portal");
    expect(catalog.data[0].capabilities).toBeDefined();
  });

  it("publishes TileJSON metadata for map clients", async () => {
    const response = await fetch(`${baseUrl}/api/v1/sources/moiat_industrial_licenses/tilejson`);
    const tilejson = await response.json();
    expect(response.status).toBe(200);
    expect(tilejson).toMatchObject({ tilejson: "3.0.0", minzoom: 0, maxzoom: 22 });
    expect(tilejson.tiles[0]).toContain("/tiles/{z}/{x}/{y}.pbf");
  });

  it("publishes a machine-readable trust manifest", async () => {
    const response = await fetch(`${baseUrl}/.well-known/uaemcp.json`);
    const manifest = await response.json();
    expect(manifest.server).toMatchObject({ runtime: "bun", version: "1.61.1" });
    expect(manifest.endpoints.tradeFlowRadar).toBe("/trade-flow");
    expect(manifest.endpoints.products).toBe("/api/v1/products");
    expect(manifest.endpoints.founderPathway).toBe("/founder-pathway");
    expect(manifest.endpoints.startupSupport).toBe("/startup-support");
    expect(manifest.endpoints.startupSupportApi).toBe("/api/v1/startup-support");
    expect(manifest.tools.read).toContain("uae_startup_support");
    expect(manifest.tools.read).toContain("uae_products_list");
    expect(manifest.endpoints.tradeFlowApi).toBe("/api/v1/trade-flow");
    expect(manifest.tools.read).toContain("uae_trade_flow_radar");
    expect(manifest.endpoints.taxServiceActivity).toBe("/tax-services");
    expect(manifest.tools.read).toContain("uae_tax_service_activity");
    expect(manifest.tools.read).toContain("uae_tax_service_archive");
    expect(manifest.tools.read).toContain("uae_place_names");
    expect(manifest.endpoints).toMatchObject({ placeNames: "/places", placeNamesApi: "/api/v1/places" });
    expect(manifest.endpoints.taxServiceArchive).toBe("/api/v1/tax-services/archive");
    expect(manifest.endpoints.taxServiceArchivePage).toBe("/tax-services/archive");
    expect(manifest.tools.write).toEqual(["uae_source_add", "uae_source_add_metadata", "uae_dataset_snapshot:create"]);
    expect(manifest.dataPolicy.fabricationAllowed).toBe(false);
  });

  it("publishes and runs intelligence recipes", async () => {
    const list = await fetch(`${baseUrl}/api/v1/intelligence/recipes`).then((response) => response.json());
    expect(list.data).toHaveLength(5);
    const result = await fetch(`${baseUrl}/api/v1/intelligence/recipes/source_coverage`).then((response) => response.json());
    expect(result.data.recipe).toBe("source_coverage");
    expect(result.data.methodology).toBeObject();
    expect(result.data.limitations).toBeArray();
  });

  it("publishes explainable indicators", async () => {
    const list = await fetch(`${baseUrl}/api/v1/intelligence/indicators`).then((response) => response.json());
    const coverage = await fetch(`${baseUrl}/api/v1/intelligence/indicators/open_data_coverage`).then((response) => response.json());
    expect(list.data).toHaveLength(4);
    expect(coverage.data).toMatchObject({ indicator: "open_data_coverage", value: 20, methodology: expect.any(Object), limitations: expect.any(Array) });
  });

  it("exposes safe snapshot scheduler status", async () => {
    const payload = await fetch(`${baseUrl}/api/v1/operations/snapshot-scheduler`).then((response) => response.json());
    expect(payload.data).toMatchObject({ enabled: false, running: false, targets: [] });
    const health = await fetch(`${baseUrl}/api/v1/operations/health-scan-scheduler`).then((response) => response.json());
    expect(health.data).toMatchObject({ enabled: false, running: false, intervalMinutes: 0 });
  });

  it("publishes the public observatory report, incidents, and source profile", async () => {
    const report = await fetch(`${baseUrl}/api/v1/observatory`).then((response) => response.json());
    const incidents = await fetch(`${baseUrl}/api/v1/observatory/incidents?limit=10`).then((response) => response.json());
    const profile = await fetch(`${baseUrl}/api/v1/observatory/sources/moiat_industrial_licenses`).then((response) => response.json());
    expect(report.data).toMatchObject({ monitoredSources: 40, currentStatus: expect.any(Object), incidents: expect.any(Object) });
    expect(incidents).toMatchObject({ ok: true, data: expect.any(Array), meta: { limit: 10 } });
    expect(profile.data).toMatchObject({ source: { id: "moiat_industrial_licenses" }, reliability: { sourceId: "moiat_industrial_licenses" }, incidents: expect.any(Array) });
    const markdown = await fetch(`${baseUrl}/api/v1/observatory/report.md`);
    expect(markdown.headers.get("content-type")).toContain("text/markdown");
    expect(await markdown.text()).toContain("# Emirates Open Data Observatory Report");
  });
});
