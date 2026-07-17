import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

const facilities = [{ Year: 2024, "Emirate En": "Dubai", "Emirate Ar": "دبي", "Sector En": "Private", "Sector Ar": "خاص", "Main Category_En": "Medical Facilities", "Main Category_Ar": "المنشآت الصحية", "Facility Type En": "Clinic", "Facility Type Ar": "عيادة", Total: 30 }];
const result = { records: facilities, source_id: "mohap_health_facilities_2024", dataset: null, total: 1, fetched_at: "2026-07-17T00:00:00Z", citation: "https://mohap.gov.ae/open-data", license: "unknown", fields: [], data_quality: { quality_score: 0.9 } } as any;

describe("UAE Evidence Studio REST contract", () => {
  it("builds a stateless dossier from only the selected evidence pillars", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/evidence-dossier", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ template: "evidence_brief", question: "What does official health and education evidence show?", language: "en", pillars: ["education", "health_facilities"] }),
    }), { fetchHealthFacilitiesRecords: async () => result });
    const body = await response?.json();

    expect(response?.status).toBe(200);
    expect(body.data).toMatchObject({ kind: "uae_evidence_dossier", scope: { pillarsRequested: 2, pillarsAvailable: 2 }, methodology: { compositeScore: false, ranking: false } });
    expect(body.data.pillars.map(({ id }: { id: string }) => id)).toEqual(["education", "health_facilities"]);
    expect(body.meta).toMatchObject({ stored: false, partial: false, filters: { pillars: ["education", "health_facilities"] } });
  });

  it("rejects unknown fields, identifying payloads and invalid pillar selections", async () => {
    for (const body of [
      { question: "A", language: "en", template: "evidence_brief", pillars: ["education" ] },
      { question: "A", language: "en", template: "evidence_brief", pillars: ["education", "unknown"] },
      { question: "A", language: "en", template: "evidence_brief", pillars: ["education", "industry"], email: "person@example.test" },
    ]) {
      const response = await handleRest(new Request("http://localhost/api/v1/evidence-dossier", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
      expect(response?.status).toBe(422);
    }
  });
});
