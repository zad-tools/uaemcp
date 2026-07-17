import { describe, expect, it } from "bun:test";
import { loadHealthFacilitiesAtlas } from "../src/health-facilities-service.js";

const records = [
  { Year: 2024, "Emirate En": "Dubai", "Emirate Ar": "دبي", "Sector En": "Private", "Sector Ar": "خاص", "Main Category_En": "Medical Facilities", "Main Category_Ar": "المنشآت الصحية", "Facility Type En": "Clinic", "Facility Type Ar": "عيادة", Total: 30 },
];
const result = { records, source_id: "mohap_health_facilities_2024", dataset: null, total: 950, fetched_at: "2026-07-17T00:00:00Z", citation: "https://mohap.gov.ae/open-data", license: "unknown", fields: [], data_quality: { quality_score: 0.9 } } as any;

describe("Health Facilities Atlas service", () => {
  it("returns live aggregate evidence with provenance", async () => {
    const loaded = await loadHealthFacilitiesAtlas(async () => result, { year: 2024, rowLimit: 20 });
    expect(loaded.data.scope).toMatchObject({ selectedYear: 2024, publishedFacilityCount: 30 });
    expect(loaded.meta).toMatchObject({ source_id: "mohap_health_facilities_2024", delivery: "live", partial: false });
  });

  it("falls back to the verified 950-row snapshot rather than returning false zero", async () => {
    const loaded = await loadHealthFacilitiesAtlas(async () => { throw new Error("blocked"); }, { year: 2024 });
    expect(loaded.data.scope).toMatchObject({ publishedRows: 950, selectedYear: 2024, matchedRows: 120, publishedFacilityCount: 7392 });
    expect(loaded.meta).toMatchObject({ delivery: "verified_snapshot", partial: true, upstream_error: "blocked" });
    expect(loaded.data.limitations.join(" ")).toContain("verified snapshot");
  });
});
