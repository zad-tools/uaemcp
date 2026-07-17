import { beforeEach, describe, expect, it, vi } from "bun:test";

vi.mock("../src/http.js", () => ({ getJson: vi.fn(), probe: vi.fn() }));

import { fetchResult, listDatasets } from "../src/connectors.js";
import { getJson } from "../src/http.js";
import type { Source } from "../src/sources.js";

const mockGetJson = getJson as unknown as ReturnType<typeof vi.fn>;

function mkSource(p: Partial<Source>): Source {
  return {
    id: "s", name_en: "n", name_ar: "n", owner: "o", category: "c", kind: "http_json",
    base_url: "https://x/", endpoint: "", docs_url: "", license: "L", default_params: {},
    row_path: [], max_page_size: null, notes: "", origin: "built_in",
    connector_config: {}, requires_api_key: false, api_docs: "", ...p,
  };
}

beforeEach(() => mockGetJson.mockReset());

describe("http_json connector", () => {
  const src = mkSource({ kind: "http_json", row_path: ["result", "Factories"], max_page_size: 10 });
  it("redacts PII and keeps geo", async () => {
    mockGetJson.mockResolvedValue({ result: { Factories: [{ CompanyName: "Acme", ContactEmail: "a@b.com", Latitude: "24.1" }] } });
    const r = await fetchResult(src, { limit: 10 });
    expect(r.records[0].ContactEmail).toBe("[redacted-open-data-contact]");
    expect(r.records[0].Latitude).toBe("24.1");
    expect(r.data_quality.confidence).toBeGreaterThan(0);
    expect(r.fetched_at).toMatch(/Z$/);
  });
  it("client-side query filter is flagged", async () => {
    mockGetJson.mockResolvedValue({ result: { Factories: [{ CompanyName: "Acme" }, { CompanyName: "Globex" }] } });
    const r = await fetchResult(src, { query: "globex", limit: 10 });
    expect(r.records.length).toBe(1);
    expect(r.data_quality.warnings.some((w) => w.includes("client-side"))).toBe(true);
  });
});

describe("ods connector", () => {
  const src = mkSource({ kind: "ods", connector_config: { api_base: "https://data.x/api/explore/v2.1" } });
  it("lists datasets", async () => {
    mockGetJson.mockResolvedValue({ total_count: 2, results: [
      { dataset_id: "roads", metas: { default: { title: "Roads", records_count: 5 } }, features: ["geo"] },
      { dataset_id: "labs", metas: { default: { title: "Labs" } } },
    ] });
    const refs = await listDatasets(src, { limit: 10 });
    expect(refs.map((r) => r.id)).toEqual(["roads", "labs"]);
    expect(refs[0].records_count).toBe(5);
    expect(refs[0].has_geo).toBe(true);
    expect(refs[1].has_geo).toBe(false);
  });
  it("fetches records with total", async () => {
    mockGetJson.mockResolvedValue({ total_count: 42, results: [{ year: 2024, value: 7 }] });
    const r = await fetchResult(src, { dataset: "roads", limit: 10 });
    expect(r.total).toBe(42);
    expect(r.dataset).toBe("roads");
    expect(r.records).toEqual([{ year: 2024, value: 7 }]);
    expect(r.data_quality.confidence).toBeGreaterThanOrEqual(0.9);
  });
  it("without dataset returns empty, not error", async () => {
    const r = await fetchResult(src, { limit: 10 });
    expect(r.records).toEqual([]);
    expect(r.dataset).toBeNull();
  });
});

describe("ckan connector", () => {
  const src = mkSource({ kind: "ckan" });
  it("parses datastore rows", async () => {
    mockGetJson.mockResolvedValue({ result: { total: 3, records: [{ a: 1 }, { a: 2 }], fields: [{ id: "a" }] } });
    const r = await fetchResult(src, { dataset: "res-1", limit: 10 });
    expect(r.total).toBe(3);
    expect(r.records.length).toBe(2);
    expect(r.fields).toEqual([{ id: "a" }]);
  });
  it("lists only datastore-active resources", async () => {
    mockGetJson.mockResolvedValue({ result: { results: [{ title: "Trade", resources: [
      { id: "r1", name: "2024", datastore_active: true },
      { id: "r2", name: "pdf", datastore_active: false },
    ] }] } });
    const refs = await listDatasets(src, { limit: 10 });
    expect(refs.map((r) => r.id)).toEqual(["r1"]);
    expect(refs[0].title_en).toContain("Trade");
  });
});

describe("arcgis connector", () => {
  const src = mkSource({ kind: "arcgis", base_url: "https://x/FeatureServer", connector_config: { default_layer: 0 } });
  it("flattens geojson and keeps geometry, redacts PII", async () => {
    mockGetJson.mockResolvedValue({ type: "FeatureCollection", features: [
      { type: "Feature", properties: { NAME_EN: "District A", ContactPhone: "+97150111222" }, geometry: { type: "Polygon", coordinates: [[[0, 0]]] } },
    ] });
    const r = await fetchResult(src, { limit: 10 });
    expect(r.records[0].NAME_EN).toBe("District A");
    expect(r.records[0].ContactPhone).toBe("[redacted-open-data-contact]");
    expect((r.records[0]._geometry as Record<string, unknown>).type).toBe("Polygon");
  });
  it("warns on text search without a field", async () => {
    mockGetJson.mockResolvedValue({ features: [] });
    const r = await fetchResult(src, { query: "villa", limit: 10 });
    expect(r.data_quality.warnings.some((w) => w.includes("text search not supported"))).toBe(true);
  });
  it("lists layers", async () => {
    mockGetJson.mockResolvedValue({ layers: [{ id: 0, name: "Districts" }], tables: [{ id: 1, name: "Stats" }] });
    const refs = await listDatasets(src, { limit: 10 });
    expect(refs.map((r) => r.id)).toEqual(["0", "1"]);
    expect(refs[0].has_geo).toBe(true);
    expect(refs[1].has_geo).toBe(false);
  });
});

describe("metadata connector honesty", () => {
  it("throws instead of fabricating", async () => {
    await expect(fetchResult(mkSource({ kind: "metadata" }), { limit: 10 })).rejects.toThrow();
  });
  it("lists no datasets", async () => {
    expect(await listDatasets(mkSource({ kind: "metadata" }))).toEqual([]);
  });
});
