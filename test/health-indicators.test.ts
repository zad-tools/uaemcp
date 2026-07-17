import { describe, expect, it } from "bun:test";
import { buildHealthIndicators } from "../src/health-indicators.js";

const rows = [
  { "Indicator Name": "Life expectancy at birth", "2016": 79.7, "2022": 83.1, "2023": 83.4 },
  { "Indicator Name": "Population growth rate", "2016": 0.008, "2022": 0.03, "2023": 0.044 },
  { "Indicator Name": "Empty indicator", "2016": null, "2022": null, "2023": null },
];

describe("MOHAP health indicators", () => {
  it("preserves source-native values as an explicit time series", () => {
    const report = buildHealthIndicators(rows, {
      citation: "https://mohap.gov.ae/en/open-data/mohap-open-data",
      fetchedAt: "2026-07-17T00:00:00Z",
    });

    expect(report).toMatchObject({
      kind: "mohap_health_core_indicators_2024",
      scope: { publishedRows: 3, usableIndicators: 2, years: [2016, 2022, 2023] },
    });
    expect(report.indicators[0]).toEqual({
      name: "Life expectancy at birth",
      latest: { year: 2023, value: 83.4 },
      series: [{ year: 2016, value: 79.7 }, { year: 2022, value: 83.1 }, { year: 2023, value: 83.4 }],
    });
    expect(report.limitations.join(" ")).toContain("source-native");
    expect(report.source.citation).toContain("mohap.gov.ae");
  });

  it("supports bounded case-insensitive indicator search without mutating rows", () => {
    const before = structuredClone(rows);
    const report = buildHealthIndicators(rows, { citation: "official", fetchedAt: "now", query: "growth", limit: 1 });
    expect(report.indicators.map((item) => item.name)).toEqual(["Population growth rate"]);
    expect(report.scope.matchedIndicators).toBe(1);
    expect(rows).toEqual(before);
  });
});
