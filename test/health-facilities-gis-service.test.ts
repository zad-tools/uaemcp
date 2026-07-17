import { describe, expect, it } from "bun:test";
import { loadHealthFacilitiesMap } from "../src/health-facilities-map-service.js";

describe("MOHAP Health Facilities GIS service", () => {
  it("returns live GIS evidence with provenance", async () => {
    const loaded = await loadHealthFacilitiesMap(async (source) => ({
      records: [{ "No.": 1, "Facility Name English": "Clinic", "Facility Name Arabic": "عيادة", Coordinator: "25.2,55.2" }],
      source_id: source.id, fetched_at: "2026-07-18T00:00:00Z", citation: source.base_url, license: source.license,
      dataset: null, total: 1, fields: [], data_quality: { quality_score: 1 },
    } as any));
    expect(loaded.data.features).toHaveLength(1);
    expect(loaded.meta).toMatchObject({ source_id: "mohap_health_facilities_gis_2026", delivery: "live", partial: false, source_rows: 1 });
  });

  it("uses a small verified snapshot when the official workbook is unavailable", async () => {
    const loaded = await loadHealthFacilitiesMap(async () => { throw new Error("blocked"); });
    expect(loaded.data.features.length).toBeGreaterThan(0);
    expect(loaded.meta).toMatchObject({ delivery: "verified_snapshot", partial: true, upstream_error: "blocked" });
    expect(loaded.data.limitations.join(" ")).toContain("small retained snapshot");
  });
});
