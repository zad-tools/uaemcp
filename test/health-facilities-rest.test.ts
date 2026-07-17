import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

const records = [{ Year: 2024, "Emirate En": "Dubai", "Emirate Ar": "دبي", "Sector En": "Private", "Sector Ar": "خاص", "Main Category_En": "Medical Facilities", "Main Category_Ar": "المنشآت الصحية", "Facility Type En": "Clinic", "Facility Type Ar": "عيادة", Total: 30 }];
const fetcher = async () => ({ records, source_id: "mohap_health_facilities_2024", dataset: null, total: 1, fetched_at: "2026-07-17T00:00:00Z", citation: "https://mohap.gov.ae/open-data", license: "unknown", fields: [], data_quality: { quality_score: 0.9 } }) as any;

describe("Health Facilities Atlas REST contract", () => {
  it("publishes bounded aggregate evidence", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/health-facilities?year=2024&emirate=Dubai&sector=Private"), { fetchHealthFacilitiesRecords: fetcher });
    const body = await response?.json();
    expect(response?.status).toBe(200);
    expect(body.data).toMatchObject({ kind: "uae_health_facilities_atlas", scope: { publishedFacilityCount: 30, matchedRows: 1 } });
    expect(body.meta).toMatchObject({ delivery: "live", source_id: "mohap_health_facilities_2024" });
  });

  it("rejects invalid years, sectors and zero limits", async () => {
    for (const query of ["year=2025", "sector=Unknown", "limit=0"]) {
      const response = await handleRest(new Request(`http://localhost/api/v1/health-facilities?${query}`));
      expect(response?.status).toBe(422);
    }
  });
});
