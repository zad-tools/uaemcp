import { describe, expect, it } from "bun:test";
import { buildFounderPathway } from "../src/founder-pathway.js";

describe("UAE Founder Pathway", () => {
  it("builds one ordered, non-identifying founder journey", () => {
    const result = buildFounderPathway({
      stage: "mvp",
      emirate: "abu_dhabi",
      setupType: "mainland",
      supportType: "incubation",
      activitySector: "technology",
    });

    expect(result.kind).toBe("uae_founder_pathway");
    expect(result.stored).toBe(false);
    expect(result.steps.map((step) => step.id)).toEqual(["establish", "support", "residency_readiness"]);
    expect(result.steps[0].officialAction.url).toContain("tamm.abudhabi");
    expect(result.steps[1].matches[0].programId).toBe("hub71_initiate");
    expect(result.steps[2].jurisdiction).toBe("abu_dhabi");
  });

  it("does not turn discovery into approval or eligibility claims", () => {
    const result = buildFounderPathway({ stage: "growth", emirate: "dubai", setupType: "free_zone", supportType: "financing" });
    expect(result.decision).toBe("planning_only");
    expect(result.steps[1].matches.every((match) => match.eligibilityDetermined === false)).toBe(true);
    expect(result.steps[2].eligibilityDetermined).toBe(false);
    expect(result.caveats.length).toBeGreaterThan(1);
  });

  it("keeps unsupported local programme geographies out of other emirates", () => {
    const result = buildFounderPathway({ stage: "mvp", emirate: "ras_al_khaimah", setupType: "mainland", supportType: "incubation" });
    expect(result.steps[1].matches.every((match) => match.scope === "federal")).toBe(true);
  });
});
