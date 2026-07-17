import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

const fetcher = async (source: { id: string }) => ({
  records: [
    { "No.": 1, "Facility Name English": "Dubai Clinic", "Facility Name Arabic": "عيادة دبي", Coordinator: "25.20,55.20", Phone: "+971500000000", Email: "person@example.test" },
    { "No.": 2, "Facility Name English": "Abu Dhabi Hospital", "Facility Name Arabic": "مستشفى أبوظبي", Coordinator: "24.45,54.37" },
  ], source_id: source.id, fetched_at: "2026-07-18T00:00:00Z", citation: "https://mohap.gov.ae/open-data",
  license: "MOHAP open data", dataset: null, total: 2, fields: [], data_quality: { quality_score: 1 },
}) as any;

describe("MOHAP Health Facilities Map REST contract", () => {
  it("returns bounded, source-cited map features without direct-contact fields", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/health-facilities-map?q=clinic&bbox=55,25,56,26&limit=20"), { fetchHealthFacilitiesMapRecords: fetcher });
    const body = await response?.json();
    expect(response?.status).toBe(200);
    expect(body.data).toMatchObject({ kind: "uae_health_facilities_gis", features: expect.any(Array) });
    expect(body.data.scope.returned).toBe(1);
    expect(JSON.stringify(body.data)).not.toContain("person@example.test");
    expect(JSON.stringify(body.data)).not.toContain("+971500000000");
    expect(body.meta).toMatchObject({ source_id: "mohap_health_facilities_gis_2026", privacy: "direct_contact_fields_redacted" });
  });

  it("accepts a bounded radius search", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/health-facilities-map?near=25.2,55.2,25&limit=10"), { fetchHealthFacilitiesMapRecords: fetcher });
    const body = await response?.json();
    expect(response?.status).toBe(200);
    expect(body.meta.filters).toEqual({ q: undefined, bbox: undefined, near: "25.2,55.2,25", limit: 10 });
  });

  it("rejects unsafe or unbounded public parameters", async () => {
    const queries = [
      "q=x", "limit=0", "limit=201", "bbox=55,25,54,26", "bbox=50,25,55,26",
      "near=25.2,55.2,0", "near=91,55.2,10", "near=25.2,55.2,201", "bbox=55,25,56,26&near=25.2,55.2,10",
    ];
    for (const query of queries) {
      const response = await handleRest(new Request(`http://localhost/api/v1/health-facilities-map?${query}`));
      expect(response?.status).toBe(422);
    }
  });
});
