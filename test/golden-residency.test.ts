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

  it("builds an executive evidence dossier from every published requirement", () => {
    const result = assessGoldenResidencyReadiness({
      pathway: "executive",
      attestedDegree: true,
      fiveYearsExperience: true,
      employmentContract: true,
      monthlySalaryAed: 52_000,
    });
    expect(result.status).toBe("potential_match");
    expect(result.matched).toEqual(["attested_degree", "executive_experience", "employment_contract", "executive_salary"]);
    expect(result.missing).toEqual([]);
    expect(result.dossier.completion).toBe(1);
    expect(result.dossier.officialReviewRequired).toBe(true);
  });

  it("keeps talent approvals specific to the competent authority", () => {
    const scientist = assessGoldenResidencyReadiness({ pathway: "scientist", professionalRecommendation: false });
    expect(scientist.missingEvidence[0].label.en).toContain("Emirates Scientists Council");
    const inventor = assessGoldenResidencyReadiness({ pathway: "inventor", professionalRecommendation: true });
    expect(inventor.matchedEvidence[0].label.en).toContain("Ministry of Economy");
  });

  it("routes the next official step by issuing jurisdiction", () => {
    const dubai = assessGoldenResidencyReadiness({ pathway: "executive", jurisdiction: "dubai", monthlySalaryAed: 50_000 });
    const abuDhabi = assessGoldenResidencyReadiness({ pathway: "executive", jurisdiction: "abu_dhabi", monthlySalaryAed: 50_000 });
    const federal = assessGoldenResidencyReadiness({ pathway: "executive", jurisdiction: "federal", monthlySalaryAed: 50_000 });

    expect(dubai.nextStep.authority).toBe("gdrfa_dubai");
    expect(dubai.nextStep.url).toContain("gdrfad.gov.ae");
    expect(abuDhabi.nextStep.authority).toBe("adro_abu_dhabi");
    expect(abuDhabi.nextStep.url).toContain("adro.gov.ae");
    expect(federal.nextStep.authority).toBe("icp");
    expect(federal.nextStep.url).toContain("icp.gov.ae");
  });
});
