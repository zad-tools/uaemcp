import { describe, expect, it } from "bun:test";
import { buildNationalEvidenceBrief, availablePillar, unavailablePillar } from "../src/national-brief.js";

describe("national evidence brief", () => {
  it("keeps pillars separate and forbids cross-pillar scoring", () => {
    const industry = availablePillar("industry", { observed: 2 }, { period: null, unit: "records", sourceId: "moiat", citation: "https://example.test/moiat", fetchedAt: "2026-07-17T00:00:00Z", limitations: ["sample"] });
    const tax = unavailablePillar("tax_activity", { period: "2025", unit: "activity", sourceId: "fta", citation: "https://example.test/fta", error: new Error("down"), limitations: ["unavailable"] });
    const report = buildNationalEvidenceBrief([tax, industry], "2026-07-17T00:00:00Z");

    expect(report.methodology).toEqual({ operation: "side_by_side_source_native_evidence", crossPillarAggregation: false, compositeScore: false });
    expect(report.pillars.map((pillar) => pillar.id)).toEqual(["industry", "tax_activity"]);
    expect(report.scope).toMatchObject({ pillarsRequested: 4, pillarsAvailable: 1, pillarsDegraded: 3 });
    expect(report.pillars[1]?.data).toBeNull();
    expect(report.limitations.join(" ")).toContain("never represented as zero");
  });
});
