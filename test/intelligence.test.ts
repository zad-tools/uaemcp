import { describe, expect, test } from "bun:test";
import { coverageRecipe, emirateComparisonRecipe, freshnessRecipe, historicalRecipe, listRecipes, trendRecipe } from "../src/intelligence.js";
import { REGISTRY } from "../src/sources.js";

describe("intelligence recipes", () => {
  test("publishes a bounded recipe catalog", () => {
    expect(listRecipes().map((recipe) => recipe.id)).toEqual(["source_coverage", "dataset_freshness", "historical_comparison", "emirate_comparison", "trend_analysis"]);
  });

  test("coverage is honest and evidence-backed", () => {
    const result = coverageRecipe(REGISTRY.list());
    expect((result.answer as Record<string, unknown>).officialPortalsIndexed).toBe(47);
    expect((result.evidence as unknown[]).length).toBe(15);
    expect(result.limitations).toBeArray();
  });

  test("freshness distinguishes current, stale and unknown", () => {
    const result = freshnessRecipe(REGISTRY.get("ajman_data_portal"), [
      { id: "new", title_en: "New", title_ar: "", modified: "2026-01-01", records_count: 1, theme: "", has_geo: false },
      { id: "old", title_en: "Old", title_ar: "", modified: "2020-01-01", records_count: 1, theme: "", has_geo: false },
      { id: "missing", title_en: "Missing", title_ar: "", modified: "", records_count: null, theme: "", has_geo: false },
    ], Date.parse("2026-07-17"));
    expect(result.answer).toMatchObject({ current: 1, stale: 1, unknown: 1, total: 3 });
  });

  test("historical comparison summarizes raw evidence", () => {
    const result = historicalRecipe({
      fromSnapshot: 1, toSnapshot: 2, changed: true,
      recordDiff: { added: 2, removed: 1 },
      schemaDiff: { addedFields: ["new"], removedFields: [], changedFields: [] },
    });
    expect(result.answer).toMatchObject({ changed: true, recordsAdded: 2, schemaFieldsAdded: ["new"] });
    expect(result.evidence).toHaveLength(1);
  });

  test("compares emirates using normalized bilingual names and cites methodology", () => {
    const result = emirateComparisonRecipe(REGISTRY.get("moiat_industrial_licenses"), [
      { EmirateNameEN: "Dubai" }, { EmirateNameAR: "دبي" }, { EmirateNameEN: "Abu Dhabi" }, { EmirateNameEN: "unknown" },
    ]);
    expect(result.answer).toMatchObject({ matchedRecords: 3, unmatchedRecords: 1 });
    expect((result.answer as Record<string, any>).emirates[0]).toMatchObject({ emirateId: "dubai", value: 2 });
    expect(result.methodology).toMatchObject({ indicator: "record_count_by_emirate" });
  });

  test("detects an increasing snapshot trend without pretending causality", () => {
    const result = trendRecipe(REGISTRY.get("moiat_industrial_licenses"), [
      { capturedAt: "2026-01-01T00:00:00Z", recordCount: 10 },
      { capturedAt: "2026-02-01T00:00:00Z", recordCount: 12 },
      { capturedAt: "2026-03-01T00:00:00Z", recordCount: 15 },
    ]);
    expect(result.answer).toMatchObject({ direction: "up", absoluteChange: 5, percentChange: 50 });
    expect((result.limitations as string[]).join(" ")).toContain("causality");
  });
});
