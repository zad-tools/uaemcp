import { describe, expect, it } from "bun:test";
import { buildHealthIndicators } from "../src/health-indicators.js";

const rows = [
  { "Indicator Name": "Life expectancy at birth", "2016": 79.7, "2022": 83.1, "2023": 83.4 },
  { "Indicator Name": "Population growth rate", "2016": 0.008, "2022": 0.03, "2023": 0.044 },
  { "Indicator Name": "Empty indicator", "2016": null, "2022": null, "2023": null },
];

const qualityRows = [
  { "Indicator Name": "Population size", "2020": 9_282_410, "2021": 9_557_000, "2022": null, "2023": 10_679 },
  { "Indicator Name": "Mixed percentage scale", "2020": 0.95, "2021": 95, "2022": 0.96, "2023": 96 },
  { "Indicator Name": "Stable series", "2020": 10, "2021": 11, "2022": 12, "2023": 13 },
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

  it("retains raw values while flagging generic scale shifts and relative outliers", () => {
    const report = buildHealthIndicators(qualityRows, { citation: "official", fetchedAt: "now" });
    const population = report.indicators.find(({ name }) => name === "Population size");
    const mixed = report.indicators.find(({ name }) => name === "Mixed percentage scale");

    expect(population?.latest).toEqual({ year: 2023, value: 10_679 });
    expect(population?.series?.at(-1)).toEqual({ year: 2023, value: 10_679 });
    expect(population?.quality?.flags).toContainEqual(expect.objectContaining({ code: "relative_outlier", years: [2023] }));
    expect(mixed?.quality?.flags).toContainEqual(expect.objectContaining({ code: "scale_shift", years: [2020, 2021, 2022, 2023] }));
    expect(report.scope.flaggedIndicators).toBe(2);
    expect(report.methodology.join(" ")).toContain("never replace or normalize raw values");
  });

  it("paginates after filtering and supports an opt-in compact response", () => {
    const full = buildHealthIndicators(qualityRows, { citation: "official", fetchedAt: "now", offset: 1, limit: 1 });
    expect(full.indicators).toHaveLength(1);
    expect(full.indicators[0]?.name).toBe("Mixed percentage scale");
    expect(full.scope).toMatchObject({ offset: 1, returnedIndicators: 1, hasMore: true, nextOffset: 2 });
    expect(full.indicators[0]?.series).toBeArray();

    const compact = buildHealthIndicators(qualityRows, { citation: "official", fetchedAt: "now", compact: true, limit: 2 });
    expect(compact.scope).toMatchObject({ offset: 0, returnedIndicators: 2, compact: true, hasMore: true, nextOffset: 2 });
    expect(compact.indicators[0]).toMatchObject({ name: "Population size", latest: { year: 2023, value: 10_679 } });
    expect(compact.indicators[0]).not.toHaveProperty("series");
  });
});
