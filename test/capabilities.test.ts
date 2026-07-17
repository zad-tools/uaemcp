import { describe, expect, it } from "bun:test";
import { aggregate } from "../src/aggregate.js";
import { exportRecords } from "../src/export.js";
import * as geo from "../src/geo.js";
import { buildSearch, searchSources, setEmbeddingProvider } from "../src/search.js";
import type { Source } from "../src/sources.js";

function mkSource(p: Partial<Source>): Source {
  return {
    id: "s", name_en: "n", name_ar: "n", owner: "o", category: "c", kind: "http_json",
    base_url: "https://x/", endpoint: "", docs_url: "", license: "L", default_params: {},
    row_path: [], max_page_size: null, notes: "", origin: "built_in",
    connector_config: {}, requires_api_key: false, api_docs: "", access_status: "live", ...p,
  };
}

const MOIAT = mkSource({ connector_config: { geo: { lat_field: "Latitude", lon_field: "Longitude" } } });

describe("geo", () => {
  it("extracts flat lat/lon as [lon,lat]", () => {
    expect(geo.extractPoint({ Latitude: "24.28", Longitude: "54.49" }, MOIAT)).toEqual([54.49, 24.28]);
  });
  it("extracts ArcGIS _geometry", () => {
    const s = mkSource({ kind: "arcgis" });
    expect(geo.extractPoint({ _geometry: { type: "Point", coordinates: [55.1, 25.2] } }, s)).toEqual([55.1, 25.2]);
  });
  it("extracts ODS geo_point_2d (array + object)", () => {
    const s = mkSource({ kind: "ods" });
    expect(geo.extractPoint({ geo_point_2d: [25, 55] }, s)).toEqual([55, 25]);
    expect(geo.extractPoint({ geo_point_2d: { lat: 25, lon: 55 } }, s)).toEqual([55, 25]);
  });
  it("returns null when no coords", () => {
    expect(geo.extractPoint({ Latitude: "n/a" }, MOIAT)).toBeNull();
  });
  it("haversine Dubai-AbuDhabi is ~100-160km", () => {
    const d = geo.haversineKm([55.27, 25.2], [54.37, 24.45]);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(160);
  });
  it("bbox and near filter", () => {
    const recs = [
      { Latitude: "25.2", Longitude: "55.27", city: "Dubai" },
      { Latitude: "24.45", Longitude: "54.37", city: "Abu Dhabi" },
    ];
    expect(geo.filterRecords(recs, MOIAT, { bbox: geo.parseBbox("55.0,25.0,55.5,25.5") }).map((r) => r.city)).toEqual(["Dubai"]);
    expect(geo.filterRecords(recs, MOIAT, { near: geo.parseNear("25.2,55.27,50") }).map((r) => r.city)).toEqual(["Dubai"]);
  });
  it("parseBbox rejects bad input", () => {
    expect(() => geo.parseBbox("1,2,3")).toThrow();
    expect(() => geo.parseBbox("55,25,54,24")).toThrow();
  });
  it("toGeoJson skips coord-less records", () => {
    const fc = geo.toGeoJson([{ Latitude: "25.2", Longitude: "55.27" }, { n: 2 }], MOIAT);
    expect(fc.type).toBe("FeatureCollection");
    expect((fc.features as unknown[]).length).toBe(1);
  });
  it("point in polygon", () => {
    const sq: geo.Point[] = [[0, 0], [0, 10], [10, 10], [10, 0]];
    expect(geo.inPolygon([5, 5], sq)).toBe(true);
    expect(geo.inPolygon([15, 5], sq)).toBe(false);
  });
});

const ROWS = [
  { emirate: "Dubai", value: 10, Products: [{ name: "Steel" }, { name: "Cement" }] },
  { emirate: "Dubai", value: 30, Products: [{ name: "Steel" }] },
  { emirate: "Abu Dhabi", value: 20, Products: [] },
];

describe("aggregate", () => {
  it("counts by group", () => {
    const out = aggregate(ROWS, { group_by: ["emirate"], metric: "count" });
    expect(Object.fromEntries(out.map((r) => [r.group.emirate, r.value]))).toEqual({ Dubai: 2, "Abu Dhabi": 1 });
  });
  it("sum and avg", () => {
    const s = aggregate(ROWS, { group_by: ["emirate"], metric: "sum", value_field: "value" });
    expect(Object.fromEntries(s.map((r) => [r.group.emirate, r.value]))).toEqual({ Dubai: 40, "Abu Dhabi": 20 });
    const a = aggregate(ROWS, { group_by: ["emirate"], metric: "avg", value_field: "value" });
    expect(Object.fromEntries(a.map((r) => [r.group.emirate, r.value])).Dubai).toBe(20);
  });
  it("nested path fan-out", () => {
    const out = aggregate(ROWS, { group_by: ["Products.name"], metric: "count" });
    const c = Object.fromEntries(out.map((r) => [r.group["Products.name"], r.value]));
    expect(c.Steel).toBe(2);
    expect(c.Cement).toBe(1);
  });
  it("non-count requires value_field", () => {
    expect(() => aggregate(ROWS, { group_by: ["emirate"], metric: "sum" })).toThrow();
  });
});

describe("export", () => {
  it("csv with nested serialised", () => {
    const { body, media, filename } = exportRecords([{ a: 1, b: { x: 2 } }], "csv", MOIAT);
    const text = body.toString("utf-8");
    expect(text).toContain("a,b");
    expect(text).toContain('{""x"":2}');
    expect(media).toContain("text/csv");
    expect(filename).toMatch(/\.csv$/);
  });
  it("geojson", () => {
    const { body, media } = exportRecords([{ Latitude: "25.2", Longitude: "55.27" }], "geojson", MOIAT);
    const fc = JSON.parse(body.toString("utf-8"));
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features.length).toBe(1);
    expect(media).toBe("application/geo+json");
  });
  it("xlsx is a valid zip (PK header)", () => {
    const { body, filename } = exportRecords([{ a: 1, b: "hi" }], "xlsx", MOIAT);
    expect(body.subarray(0, 2).toString("latin1")).toBe("PK");
    expect(body.length).toBeGreaterThan(200);
    expect(filename).toMatch(/\.xlsx$/);
  });
  it("rejects bad format", () => {
    // @ts-expect-error deliberate invalid format
    expect(() => exportRecords([], "pdf", MOIAT)).toThrow();
  });
});

describe("search", () => {
  it("finds ajman by name", () => {
    const hits = searchSources("ajman", 5);
    expect(hits.some((h) => h.source_id === "ajman_data_portal")).toBe(true);
  });
  it("bilingual arabic", () => {
    expect(searchSources("عجمان", 5).some((h) => h.source_id === "ajman_data_portal")).toBe(true);
  });
  it("exact id ranks first", () => {
    expect(searchSources("moiat_industrial_licenses", 5)[0].source_id).toBe("moiat_industrial_licenses");
  });
  it("reports hybrid BM25 ranking evidence", () => {
    const [first] = searchSources("industrial factory", 1);
    expect(first.source_id).toBe("moiat_industrial_licenses");
    expect(first.ranking).toMatchObject({ method: "hybrid_bm25_glossary", bm25: expect.any(Number) });
    expect(first.matched_terms).toContain("industrial");
  });
  it("optionally reranks with a bounded embedding provider", async () => {
    setEmbeddingProvider({ embed: async (texts) => texts.map((text) => text.includes("Dubai Municipality") ? [1, 0] : text === "civic services" ? [1, 0] : [0, 1]) });
    try {
      const result = await buildSearch("civic services", { limit: 5 });
      expect(result.ranking).toBe("hybrid_bm25_embedding_glossary");
      expect((result.sources as Record<string, unknown>[])[0].source_id).toBe("dubai_municipality_open_data");
    } finally {
      setEmbeddingProvider(null);
    }
  });
});
