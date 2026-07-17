import { describe, expect, it } from "bun:test";
import { SourceNotFound, ValidationError } from "../src/errors.js";
import { REGISTRY } from "../src/sources.js";
import { Registry } from "../src/sources.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("Registry", () => {
  it("lists 47 built-in sources", () => {
    expect(REGISTRY.list().length).toBe(47);
  });

  it("registers the official GCAA publication index with honest discovery boundaries", () => {
    expect(REGISTRY.get("gcaa_current_aip_publications")).toMatchObject({ owner: "UAE General Civil Aviation Authority", category: "aviation", access_status: "live" });
    expect(REGISTRY.get("gcaa_current_aip_publications").notes).toContain("not NOTAM");
  });

  it("registers the official MOHAP 2026 GIS sheet as a distinct live source", () => {
    expect(REGISTRY.get("mohap_health_facilities_gis_2026")).toMatchObject({
      kind: "xlsx",
      access_status: "live",
      max_page_size: 16_000,
      connector_config: { sheet: 2, header_row: 4, data_start_row: 5, row_limit: 15_326 },
    });
  });

  it("registers three live official TDRA connectivity workbooks", () => {
    const sources = [
      REGISTRY.get("tdra_active_mobile_subscriptions_2025"),
      REGISTRY.get("tdra_broadband_per_100_2025"),
      REGISTRY.get("tdra_fixed_lines_per_100_2025"),
    ];
    expect(sources.every(({ kind, access_status }) => kind === "xlsx" && access_status === "live")).toBe(true);
    expect(sources.every(({ license }) => license.includes("attribution to TDRA"))).toBe(true);
  });

  it("registers the official FGIC National Gazetteer as a live geospatial source", () => {
    const source = REGISTRY.get("fgic_national_gazetteer");
    expect(source).toMatchObject({
      owner: "Federal Geographic Information Center",
      kind: "arcgis",
      access_status: "live",
      category: "geospatial",
      connector_config: { default_layer: 0, text_search_fields: ["wsearch", "englishname", "gazetteername", "wotaltah"] },
    });
    expect(source.docs_url).toContain("atlas.fgic.gov.ae");
    expect(source.license).toContain("informational use");
  });

  it("registers the bounded official FTA 2025 service-activity workbook", () => {
    expect(REGISTRY.get("fta_service_activity_2025")).toMatchObject({
      owner: "Federal Tax Authority", kind: "xlsx", access_status: "live",
      connector_config: { sheet: 1, header_row: 5, data_start_row: 6, row_limit: 10 },
    });
    expect(REGISTRY.get("fta_service_activity_2024")).toMatchObject({
      kind: "xlsx",
      access_status: "live",
      connector_config: { header_row: 2, data_start_row: 4, row_limit: 17 },
    });
  });

  it("gets a known source", () => {
    const s = REGISTRY.get("moiat_industrial_licenses");
    expect(s.kind).toBe("http_json");
    expect(s.row_path).toEqual(["result", "Factories"]);
  });

  it("throws on an unknown source", () => {
    expect(() => REGISTRY.get("does_not_exist")).toThrow(SourceNotFound);
  });

  it("rejects a custom source missing required fields", () => {
    // deliberately invalid partial payload
    expect(() => REGISTRY.addMetadataSource({ id: "x" } as Record<string, string>)).toThrow(
      ValidationError,
    );
  });

  it("cannot override a built-in source", () => {
    expect(() =>
      REGISTRY.addMetadataSource({
        id: "moiat_industrial_licenses",
        name_en: "x",
        name_ar: "x",
        owner: "x",
        base_url: "https://example.com/",
      }),
    ).toThrow(ValidationError);
  });

  it("persists a validated custom connector source", () => {
    const directory = mkdtempSync(join(tmpdir(), "uaemcp-registry-"));
    const path = join(directory, "sources.json");
    try {
      const registry = new Registry(path);
      const added = registry.addSource({
        id: "health_csv", name_en: "Health CSV", name_ar: "بيانات الصحة",
        owner: "Test Authority", base_url: "https://example.gov.ae/data.csv", kind: "csv",
        connector_config: { delimiter: "," },
      });
      expect(added).toMatchObject({ kind: "csv", access_status: "live", origin: "custom" });
      expect(new Registry(path).get("health_csv").connector_config).toEqual({ delimiter: "," });
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it("rejects unsafe custom source definitions", () => {
    const registry = new Registry(join(tmpdir(), `uaemcp-missing-${crypto.randomUUID()}.json`));
    expect(() => registry.addSource({ id: "Bad ID", name_en: "x", name_ar: "x", owner: "x", base_url: "file:///etc/passwd", kind: "csv" })).toThrow(ValidationError);
  });
});
