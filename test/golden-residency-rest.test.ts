import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

describe("Golden Residency REST contract", () => {
  it("serves the official pathway catalogue", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/golden-residency"));
    const body = await response!.json() as any;
    expect(response?.status).toBe(200);
    expect(body.data.kind).toBe("uae_golden_residency_navigator");
    expect(body.data.pathways).toHaveLength(5);
    expect(body.meta.decision).toBe("informational_only");
  });

  it("assesses bounded non-identifying inputs", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/golden-residency/assess", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ pathway: "high_school_student", gradePercent: 96, ministryRecommendation: true }),
    }));
    const body = await response!.json() as any;
    expect(response?.status).toBe(200);
    expect(body.data.status).toBe("potential_match");
    expect(body.meta.stored).toBe(false);
  });

  it("rejects identifiers and unknown fields", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/golden-residency/assess", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ pathway: "entrepreneur", passportNumber: "P123" }),
    }));
    expect(response?.status).toBe(422);
    expect((await response!.json() as any).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns a printable executive evidence dossier without storing inputs", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/golden-residency/assess", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ pathway: "executive", attestedDegree: true, fiveYearsExperience: true, employmentContract: true, monthlySalaryAed: 50_000 }),
    }));
    const body = await response!.json() as any;
    expect(body.data.dossier).toMatchObject({ completion: 1, evidenceCount: 4, officialReviewRequired: true, storesPersonalData: false });
    expect(body.data.matchedEvidence).toHaveLength(4);
    expect(body.meta.stored).toBe(false);
  });

  it("accepts a non-identifying jurisdiction and returns the competent official portal", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/golden-residency/assess", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ pathway: "entrepreneur", jurisdiction: "dubai", projectValueAed: 500_000 }),
    }));
    const body = await response!.json() as any;
    expect(response?.status).toBe(200);
    expect(body.data.nextStep).toMatchObject({ authority: "gdrfa_dubai", jurisdiction: "dubai" });
  });
});
