import { beforeEach, describe, expect, it, vi } from "bun:test";

vi.mock("../src/http.js", () => ({ getBytes: vi.fn(), getJson: vi.fn(), getText: vi.fn(), postJson: vi.fn(), probe: vi.fn() }));

import { connectorCapabilities, connectorKinds, fetchResult, listDatasets, parseDelimited, parseSdmxJson, parseXmlRecords, registerConnector } from "../src/connectors.js";
import { getBytes, getJson, getText, postJson } from "../src/http.js";
import { exportRecords } from "../src/export.js";
import { parseXlsx } from "../src/xlsx.js";
import type { Source } from "../src/sources.js";
import { zipSync, strToU8 } from "fflate";

const mockGetJson = getJson as unknown as ReturnType<typeof vi.fn>;
const mockGetText = getText as unknown as ReturnType<typeof vi.fn>;
const mockGetBytes = getBytes as unknown as ReturnType<typeof vi.fn>;
const mockPostJson = postJson as unknown as ReturnType<typeof vi.fn>;

function mkSource(p: Partial<Source>): Source {
  return {
    id: "s", name_en: "n", name_ar: "n", owner: "o", category: "c", kind: "http_json",
    base_url: "https://x/", endpoint: "", docs_url: "", license: "L", default_params: {},
    row_path: [], max_page_size: null, notes: "", origin: "built_in",
    connector_config: {}, requires_api_key: false, api_docs: "", access_status: "live", ...p,
  };
}

beforeEach(() => { mockGetJson.mockReset(); mockGetText.mockReset(); mockGetBytes.mockReset(); mockPostJson.mockReset(); });

describe("http_json connector", () => {
  const src = mkSource({ kind: "http_json", row_path: ["result", "Factories"], max_page_size: 10 });
  it("redacts PII and keeps geo", async () => {
    mockGetJson.mockResolvedValue({ result: { Factories: [{ CompanyName: "Acme", ContactEmail: "a@b.com", Latitude: "24.1" }] } });
    const r = await fetchResult(src, { limit: 10 });
    expect(r.records[0].ContactEmail).toBe("[redacted-open-data-contact]");
    expect(r.records[0].Latitude).toBe("24.1");
    expect(r.data_quality.confidence).toBeGreaterThan(0);
    expect(r.data_quality.completeness).toBeGreaterThan(0);
    expect(r.data_quality.source_trust).toBe("official_registry");
    expect(r.data_quality.coverage).toEqual({ returned: 1, upstream_total: null, ratio: null });
    expect(r.data_quality.quality_score).toBeGreaterThan(0);
    expect(r.data_quality.freshness.status).toBe("unknown");
    expect(r.data_quality.schema_stability.status).toBe("unknown");
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
  it("escapes ODS search expressions as a JSON string literal", async () => {
    mockGetJson.mockResolvedValue({ total_count: 0, results: [] });
    await fetchResult(src, { dataset: "roads", query: 'clinic\\" ) OR true', limit: 10 });
    const params = mockGetJson.mock.calls[0][1] as Record<string, string>;
    expect(params.where).toBe('search("clinic\\\\\\\" ) OR true")');
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
  it("builds a bounded OR search across configured bilingual ArcGIS fields", async () => {
    mockGetJson.mockResolvedValue({ features: [] });
    const source = mkSource({ kind: "arcgis", base_url: "https://x/FeatureServer", connector_config: { text_search_fields: ["wsearch", "englishname"] } });
    await fetchResult(source, { query: "Dubai's", limit: 5 });
    expect(mockGetJson.mock.calls[0][1].where).toBe("wsearch LIKE '%Dubai''s%' OR englishname LIKE '%Dubai''s%'");
  });
  it("omits source-declared unreliable fields without mutating the remaining ArcGIS record", async () => {
    mockGetJson.mockResolvedValue({ features: [{ properties: { englishname: "Dubai", descriptioneng: "placeholder", category: "مدينة" }, geometry: null }] });
    const source = mkSource({ kind: "arcgis", base_url: "https://x/FeatureServer", connector_config: { default_layer: 0, exclude_fields: ["descriptioneng"] } });
    const result = await fetchResult(source, { limit: 1 });
    expect(result.records[0]).toEqual({ englishname: "Dubai", category: "مدينة", _geometry: null });
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

describe("csv connector", () => {
  const src = mkSource({ kind: "csv", base_url: "https://data.example/health.csv" });
  it("parses quoted values, filters, paginates and redacts", async () => {
    mockGetText.mockResolvedValue('name,note,email\n"Clinic, One","line ""quoted""",a@example.com\nClinic Two,ok,b@example.com\n');
    const result = await fetchResult(src, { query: "two", limit: 1 });
    expect(result.total).toBe(2);
    expect(result.records).toEqual([{ name: "Clinic Two", note: "ok", email: "[redacted-open-data-contact]" }]);
    expect(result.data_quality.warnings[0]).toContain("client-side");
  });
  it("rejects malformed and duplicate headers", () => {
    expect(() => parseDelimited('name,name\na,b')).toThrow("duplicate header");
    expect(() => parseDelimited('name\n"broken')).toThrow("unterminated");
  });
});

describe("sparql connector", () => {
  it("flattens SELECT bindings and enforces a bounded query", async () => {
    const src = mkSource({ kind: "sparql", connector_config: { default_query: "SELECT ?name ?email WHERE { ?s ?p {{search}} }" } });
    mockGetJson.mockResolvedValue({ results: { bindings: [{ name: { type: "literal", value: "Clinic" }, email: { type: "literal", value: "care@example.com" } }] } });
    const result = await fetchResult(src, { query: "health", limit: 5 });
    expect(result.records).toEqual([{ name: "Clinic", email: "[redacted-open-data-contact]" }]);
    const params = mockGetJson.mock.calls[0][1] as Record<string, string>;
    expect(params.query).toContain("LIMIT 5");
    expect(params.query).toContain('"health"');
  });
  it("accepts bounded PREFIX declarations before SELECT", async () => {
    mockGetJson.mockResolvedValue({ results: { bindings: [] } });
    await fetchResult(mkSource({ kind: "sparql", connector_config: { default_query: "PREFIX ex: <https://example.gov/>\nSELECT ?s WHERE { ?s a ex:Service }" } }));
    const params = mockGetJson.mock.calls[0][1] as Record<string, string>;
    expect(params.query).toContain("PREFIX ex:");
  });
  it("rejects updates, SERVICE and arbitrary queries by default", async () => {
    await expect(fetchResult(mkSource({ kind: "sparql", connector_config: { default_query: "DELETE WHERE { ?s ?p ?o }" } }))).rejects.toThrow("only permits SELECT");
    await expect(fetchResult(mkSource({ kind: "sparql", connector_config: { default_query: "SELECT * WHERE { SERVICE <https://x> { ?s ?p ?o } }" } }))).rejects.toThrow("SERVICE");
    await expect(fetchResult(mkSource({ kind: "sparql", connector_config: { default_query: "SELECT * WHERE { ?s ?p ?o }" } }), { query: "SELECT * WHERE {}" })).rejects.toThrow("does not accept arbitrary");
  });
  it("rejects oversized configured queries before regular-expression validation", async () => {
    const oversized = `SELECT * WHERE { ${"?s ?p ?o . ".repeat(1_000)} }`;
    await expect(fetchResult(mkSource({ kind: "sparql", connector_config: { default_query: oversized } }))).rejects.toThrow("10,000");
  });
});

describe("xlsx connector", () => {
  it("reads an official-style table from configured rows and selected columns", async () => {
    const workbook = zipSync({
      "[Content_Types].xml": strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>'),
      "xl/worksheets/sheet1.xml": strToU8(`<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
        <row r="1"><c r="A1" t="inlineStr"><is><t>Report title</t></is></c></row>
        <row r="2"><c r="B2" t="inlineStr"><is><t>Services</t></is></c><c r="C2" t="inlineStr"><is><t>Jan</t></is></c><c r="D2" t="inlineStr"><is><t>Feb</t></is></c><c r="F2" t="inlineStr"><is><t>Mar</t></is></c></row>
        <row r="3"><c r="B3" t="inlineStr"><is><t>VAT Registration</t></is></c><c r="C3"><v>10</v></c><c r="D3"><v>12</v></c><c r="F3"><v>14</v></c></row>
      </sheetData></worksheet>`),
    });
    mockGetBytes.mockResolvedValue(workbook);
    const source = mkSource({
      kind: "xlsx",
      base_url: "https://example.gov.ae/activity.xlsx",
      connector_config: { header_row: 2, data_start_row: 3, columns: { Service: "B", Jan: "C", Feb: "D", Mar: "F" } },
    });
    const result = await fetchResult(source, { limit: 10 });
    expect(result.records).toEqual([{ Service: "VAT Registration", Jan: 10, Feb: 12, Mar: 14 }]);
  });
  it("uses physical worksheet row numbers when earlier rows are omitted", () => {
    const workbook = zipSync({
      "[Content_Types].xml": strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>'),
      "xl/worksheets/sheet1.xml": strToU8('<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="2"><c r="B2" t="inlineStr"><is><t>Service</t></is></c></row><row r="4"><c r="B4" t="inlineStr"><is><t>First published service</t></is></c></row></sheetData></worksheet>'),
    });
    expect(parseXlsx(workbook, 1, { headerRow: 2, dataStartRow: 4, columns: { Service: "B" } })).toEqual([{ Service: "First published service" }]);
  });
  it("rejects invalid configured row boundaries", () => {
    const workbook = exportRecords([{ name: "Clinic" }], "xlsx", mkSource({}), null).body;
    expect(() => parseXlsx(workbook, 1, { headerRow: 0 })).toThrow("positive integer");
    expect(() => parseXlsx(workbook, 1, { dataStartRow: 1.5 })).toThrow("positive integer");
  });

  it("reads a bounded workbook and redacts contacts", async () => {
    const source = mkSource({ kind: "xlsx", base_url: "https://example.gov.ae/health.xlsx" });
    const workbook = exportRecords([{ name: "Clinic", count: 12, email: "care@example.com" }], "xlsx", source, null).body;
    expect(parseXlsx(workbook)).toEqual([{ name: "Clinic", count: "12", email: "care@example.com" }]);
    mockGetBytes.mockResolvedValue(workbook);
    const result = await fetchResult(source, { limit: 1 });
    expect(result.records).toEqual([{ name: "Clinic", count: "12", email: "[redacted-open-data-contact]" }]);
  });

  it("coerces only source-allowlisted statistical fields before redaction", async () => {
    const workbook = exportRecords([
      { Statistics: 44105, "Active Mobile Subscriptions[ii]": "16,716,782 ", ContactPhone: "0501234567", ContactEmail: "person@example.ae" },
      { Statistics: 44136, "Active Mobile Subscriptions[ii]": "16,707,715 ", ContactPhone: "0507654321", ContactEmail: "other@example.ae" },
      { Statistics: 44166, "Active Mobile Subscriptions[ii]": "16,820,680 ", ContactPhone: "0501112223", ContactEmail: "third@example.ae" },
    ], "xlsx", mkSource({}), null).body;
    mockGetBytes.mockResolvedValue(workbook);
    const source = mkSource({ kind: "xlsx", connector_config: { redaction_exempt_fields: ["Active Mobile Subscriptions[ii]"] } });
    const result = await fetchResult(source, { limit: 10 });
    expect(result.records.map((record) => record["Active Mobile Subscriptions[ii]"])).toEqual([16_716_782, 16_707_715, 16_820_680]);
    expect(result.records.every((record) => record.ContactPhone === "[redacted-open-data-contact]" && record.ContactEmail === "[redacted-open-data-contact]")).toBe(true);
  });

  it("rejects invalid exemption configuration and non-numeric exempt values", async () => {
    const workbook = exportRecords([{ mobile: "not-a-statistic" }], "xlsx", mkSource({}), null).body;
    mockGetBytes.mockResolvedValue(workbook);
    await expect(fetchResult(mkSource({ kind: "xlsx", connector_config: { redaction_exempt_fields: "mobile" } }))).rejects.toThrow("redaction_exempt_fields");
    await expect(fetchResult(mkSource({ kind: "xlsx", connector_config: { redaction_exempt_fields: ["mobile"] } }))).rejects.toThrow("non-negative numeric values");
  });

  it("honors a source-declared table row boundary before search and pagination", async () => {
    const source = mkSource({ kind: "xlsx", base_url: "https://example.gov.ae/activity.xlsx", connector_config: { row_limit: 2 } });
    const workbook = exportRecords([{ service: "A" }, { service: "B" }, { service: "unrelated footer table" }], "xlsx", source, null).body;
    mockGetBytes.mockResolvedValue(workbook);
    const result = await fetchResult(source, { query: "table", limit: 10 });
    expect(result.records).toEqual([]);
    expect(result.total).toBe(2);
  });

  it("rejects non-XLSX bytes", () => {
    expect(() => parseXlsx(new Uint8Array([1, 2, 3]))).toThrow("valid XLSX");
  });
});

describe("sdmx connector", () => {
  const payload = {
    structure: { dimensions: {
      series: [{ id: "FREQ", values: [{ id: "A" }] }, { id: "EMIRATE", values: [{ id: "DXB" }, { id: "AUH" }] }],
      observation: [{ id: "TIME_PERIOD", values: [{ id: "2024" }, { id: "2025" }] }],
    } },
    dataSets: [{ series: { "0:1": { observations: { "0": [10], "1": [12, "estimated"] } } } }],
  };
  it("flattens SDMX dimensions and observations", () => {
    expect(parseSdmxJson(payload)).toEqual([
      { FREQ: "A", EMIRATE: "AUH", TIME_PERIOD: "2024", OBS_VALUE: 10 },
      { FREQ: "A", EMIRATE: "AUH", TIME_PERIOD: "2025", OBS_VALUE: 12, OBS_ATTRIBUTES: ["estimated"] },
    ]);
  });
  it("fetches, searches and paginates SDMX JSON", async () => {
    mockGetJson.mockResolvedValue(payload);
    const result = await fetchResult(mkSource({ kind: "sdmx" }), { query: "2025", limit: 1 });
    expect(result.total).toBe(2);
    expect(result.records[0]).toMatchObject({ TIME_PERIOD: "2025", OBS_VALUE: 12 });
  });
});

describe("XML and RSS connectors", () => {
  const xml = `<?xml version="1.0"?><feed><item><title><![CDATA[Clinic & Care]]></title><count>12</count></item><item><title>Hospital &amp; Lab</title><count>7</count></item></feed>`;
  it("parses configured rows without executing document entities", () => {
    expect(parseXmlRecords(xml, "item")).toEqual([
      { title: "Clinic & Care", count: "12" },
      { title: "Hospital & Lab", count: "7" },
    ]);
    expect(() => parseXmlRecords('<!DOCTYPE x [<!ENTITY ext SYSTEM "file:///etc/passwd">]><x/>', "item")).toThrow("DOCTYPE");
  });
  it("matches exact row tags and strips nested markup with a bounded scanner", () => {
    const input = "<feed><itemized><title>wrong</title></itemized><item><title>Clinic <b>One</b></title><constructor>blocked</constructor></item></feed>";
    expect(parseXmlRecords(input, "item")).toEqual([{ title: "Clinic One" }]);
  });
  it("fetches RSS/XML, searches and paginates", async () => {
    mockGetText.mockResolvedValue(xml);
    const result = await fetchResult(mkSource({ kind: "rss", connector_config: { row_tag: "item" } }), { query: "hospital", limit: 1 });
    expect(result.total).toBe(2);
    expect(result.records).toEqual([{ title: "Hospital & Lab", count: "7" }]);
  });
});

describe("Socrata connector", () => {
  it("uses bounded SODA pagination and text search", async () => {
    mockGetJson.mockResolvedValue([{ name: "Clinic", count: "4" }]);
    const result = await fetchResult(mkSource({ kind: "socrata", base_url: "https://data.example.gov/resource/abcd-1234.json" }), { query: "clinic", offset: 5, limit: 7 });
    expect(result.records).toEqual([{ name: "Clinic", count: "4" }]);
    expect(mockGetJson.mock.calls[0][1]).toMatchObject({ "$limit": 7, "$offset": 5, "$q": "clinic" });
  });
});

describe("GraphQL connector", () => {
  it("posts only a configured bounded query and extracts its row path", async () => {
    mockPostJson.mockResolvedValue({ data: { facilities: { nodes: [{ name: "Clinic" }] } } });
    const source = mkSource({ kind: "graphql", connector_config: { query: "query Facilities($limit: Int!, $offset: Int!) { facilities(limit: $limit, offset: $offset) { nodes { name } } }", row_path: ["data", "facilities", "nodes"] } });
    const result = await fetchResult(source, { limit: 9, offset: 2 });
    expect(result.records).toEqual([{ name: "Clinic" }]);
    expect(mockPostJson.mock.calls[0][1]).toMatchObject({ variables: { limit: 9, offset: 2, search: null } });
  });
  it("rejects mutation documents and missing configured queries", async () => {
    await expect(fetchResult(mkSource({ kind: "graphql", connector_config: { query: "mutation { eraseAll }" } }))).rejects.toThrow("query operations");
    await expect(fetchResult(mkSource({ kind: "graphql" }))).rejects.toThrow("configured query");
  });
});

describe("connector plugin registry", () => {
  it("registers a connector without changing dispatch code", async () => {
    registerConnector("fixture_test", {
      capabilities: { records: true, search: true, geo: false, queryLanguage: "text" },
      fetch: async (source) => ({
        records: [{ plugin: true }], source_id: source.id, fetched_at: "2026-01-01T00:00:00Z",
        citation: source.base_url, license: source.license, dataset: null, total: 1, fields: [],
        data_quality: {
          confidence: 1, warnings: [], validation: { records_out: 1 }, completeness: 1,
          freshness: { status: "unknown", observed_at: null }, source_trust: "custom_source",
          coverage: { returned: 1, upstream_total: 1, ratio: 1 },
          schema_stability: { status: "unknown", compared_to: null }, last_successful_sync: "2026-01-01T00:00:00Z",
          record_count_trend: { status: "unknown", change: null }, quality_score: 1,
        },
      }),
      datasets: async () => [{ id: "one", title_en: "One", title_ar: "واحد", records_count: 1, theme: "test", modified: "", has_geo: false }],
    });
    const source = mkSource({ kind: "fixture_test" as Source["kind"] });
    expect((await fetchResult(source)).records).toEqual([{ plugin: true }]);
    expect((await listDatasets(source))[0].id).toBe("one");
    expect(connectorKinds()).toContain("fixture_test");
    expect(connectorCapabilities("fixture_test")).toMatchObject({ records: true, geo: false });
  });

  it("rejects duplicate connector names", () => {
    expect(() => registerConnector("metadata", { fetch: async () => { throw new Error("never"); } })).toThrow("connector already registered");
  });
});
