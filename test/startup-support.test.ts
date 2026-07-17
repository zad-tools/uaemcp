import { describe, expect, it } from "bun:test";
import { matchStartupSupport, startupSupportCatalogue } from "../src/startup-support.js";

describe("UAE Startup Support Navigator", () => {
  it("publishes a dated catalogue of primary official or government-backed programs", () => {
    const catalogue = startupSupportCatalogue();
    expect(catalogue.programs.length).toBeGreaterThanOrEqual(8);
    expect(catalogue.programs.every((program) => program.officialUrl.startsWith("https://"))).toBe(true);
    expect(catalogue.verifiedAt).toBe("2026-07-17");
  });

  it("ranks relevance without claiming eligibility", () => {
    const result = matchStartupSupport({ stage: "idea", supportType: "incubation", emirate: "abu_dhabi" });
    expect(result.matches[0].programId).toBe("hub71_initiate");
    expect(result.decision).toBe("discovery_only");
    expect(result.stored).toBe(false);
    expect(result.matches.every((match) => match.eligibilityDetermined === false)).toBe(true);
  });

  it("keeps financing filters conservative", () => {
    const result = matchStartupSupport({ stage: "growth", supportType: "financing", emirate: "any" });
    expect(result.matches.map((match) => match.programId)).toContain("edb_startup_finance");
    expect(result.caveats.length).toBeGreaterThan(0);
  });
});
