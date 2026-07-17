import { describe, expect, it } from "bun:test";
import { assessGoldenResidencyReadiness, goldenResidencyCatalogue } from "../src/golden-residency.js";

describe("Golden Residency readiness navigator", () => {
  it("publishes five official pathways with dated primary-source evidence", () => {
    const catalogue = goldenResidencyCatalogue();
    expect(catalogue.pathways).toHaveLength(5);
    expect(catalogue.verifiedAt).toBe("2026-07-17");
    expect(catalogue.sources.every((source) => source.url.includes("icp.gov.ae") || source.url.includes("u.ae"))).toBe(true);
    expect(catalogue.disclaimer.en).toContain("not an eligibility decision");
    expect(catalogue.disclaimer.ar).toContain("ليس قرار أهلية");
  });

  it("returns potential matches without claiming eligibility", () => {
    const result = assessGoldenResidencyReadiness({
      pathway: "entrepreneur",
      projectValueAed: 600_000,
      innovativeProjectEvidence: true,
      incubatorRecommendation: false,
    });
    expect(result.status).toBe("potential_match");
    expect(result.matched).toContain("project_value");
    expect(result.missing).toContain("incubator_recommendation");
    expect(JSON.stringify(result)).not.toContain('"eligible"');
  });

  it("does not infer a match when information is insufficient", () => {
    const result = assessGoldenResidencyReadiness({ pathway: "public_investor" });
    expect(result.status).toBe("not_enough_information");
    expect(result.nextStep.url).toContain("icp.gov.ae");
  });
});
