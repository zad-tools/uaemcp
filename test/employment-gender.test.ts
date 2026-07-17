import { describe, expect, it } from "bun:test";
import { strToU8, zipSync } from "fflate";
import {
  buildEmploymentGenderReport,
  clearEmploymentGenderCache,
  EMPLOYMENT_GENDER_SNAPSHOT_META,
  loadEmploymentGender,
  parseMohreEmploymentGenderWorkbook,
} from "../src/employment-gender.js";

const xml = (rows: ReadonlyArray<ReadonlyArray<string | number>>): string =>
  `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, rowIndex) =>
    `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => {
      const reference = `${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}`;
      return typeof value === "number"
        ? `<c r="${reference}"><v>${value}</v></c>`
        : `<c r="${reference}" t="inlineStr"><is><t>${value}</t></is></c>`;
    }).join("")}</row>`,
  ).join("")}</sheetData></worksheet>`;

const SOURCE_VALUES = [
  [2020, 0.8944606554931285, 0.10553934450687157],
  [2021, 0.8879110651288872, 0.11208893487111286],
  [2022, 0.8817088992917543, 0.11829110070824565],
  [2023, 0.8685783126344298, 0.1314216873655702],
  [2024, 0.8581271671570649, 0.14187283284293503],
] as const;

function workbook(values: ReadonlyArray<readonly [number, number, number]> = SOURCE_VALUES): Uint8Array {
  const metadata = [
    ["Metadata", ""],
    ["Dataset Name_EN", "Employment by gender (2020–2024)"],
    [" definition_EN", "The proportion of private sector employees categorized by gender (male/female)."],
    ["Source", "https://www.mohre.gov.ae"],
    ["Data Owner_EN", "Ministry of Human Resources and Emiratisation"],
    ["Last Update Date", "2024-12-31"],
    ["Calculation Methodology", "Based on ministry data and official labor systems"],
  ];
  const report: ReadonlyArray<ReadonlyArray<string | number>> = [
    ["نسبة العمالة المسجلة في القطاع الخاص في وزارة الموارد البشرية والتوطين حسب النوع، 2020-2024"],
    ["Employment by Gender 2020 - 2024"],
    ["النوع", "ذكر", "أنثى"],
    ["Gender", "male", "female"],
    ...values,
  ];
  return zipSync({
    "[Content_Types].xml": strToU8("<Types/>"),
    "xl/worksheets/sheet1.xml": strToU8(xml(metadata)),
    "xl/worksheets/sheet2.xml": strToU8(xml(report)),
  });
}

describe("MOHRE Employment by Gender", () => {
  it("parses the complete official 2020–2024 ratio series", () => {
    const observations = parseMohreEmploymentGenderWorkbook(workbook());

    expect(observations).toHaveLength(10);
    expect(observations[0]).toEqual({ year: 2020, gender: "male", value: 0.8944606554931285, unit: "ratio" });
    expect(observations.at(-1)).toEqual({ year: 2024, gender: "female", value: 0.14187283284293503, unit: "ratio" });
  });

  it("rejects incomplete years and ratios that are not finite shares summing to one", () => {
    expect(() => parseMohreEmploymentGenderWorkbook(workbook(SOURCE_VALUES.slice(0, 4)))).toThrow("incomplete for 2024");
    expect(() => parseMohreEmploymentGenderWorkbook(workbook([
      ...SOURCE_VALUES.slice(0, 4),
      [2024, 0.9, 0.2],
    ]))).toThrow("must sum to one");
    expect(() => parseMohreEmploymentGenderWorkbook(workbook([
      ...SOURCE_VALUES.slice(0, 4),
      [2024, 1.1, -0.1],
    ]))).toThrow("between zero and one");
  });

  it("builds an immutable year and gender evidence slice with provenance and reuse terms", () => {
    const observations = parseMohreEmploymentGenderWorkbook(workbook());
    const before = structuredClone(observations);
    const report = buildEmploymentGenderReport(observations, {
      fromYear: 2024,
      toYear: 2024,
      gender: "female",
      fetchedAt: "2026-07-17T22:56:27Z",
      delivery: "live",
    });

    expect(report.scope).toEqual({
      gender: "female",
      fromYear: 2024,
      toYear: 2024,
      returnedObservations: 1,
    });
    expect(report.observations).toEqual([{ year: 2024, gender: "female", value: 0.14187283284293503, unit: "ratio" }]);
    expect(report.source).toMatchObject({
      publisher: "Ministry of Human Resources and Emiratisation",
      sourceLastUpdated: "2024-12-31",
      license: { name: "MOHRE Open Data Policy", attributionRequired: true },
    });
    expect(report.limitations.join(" ")).toContain("not employee counts");
    expect(report.limitations.join(" ")).toContain("does not cover government employment");
    expect(observations).toEqual(before);
  });

  it("rejects unsupported evidence filters", () => {
    const observations = parseMohreEmploymentGenderWorkbook(workbook());
    expect(() => buildEmploymentGenderReport(observations, { fromYear: 2019, fetchedAt: "x", delivery: "live" })).toThrow("years must be between 2020 and 2024");
    expect(() => buildEmploymentGenderReport(observations, { gender: "other" as never, fetchedAt: "x", delivery: "live" })).toThrow("gender must be male or female");
  });

  it("serves live data, reuses the complete cache and falls back to the verified full snapshot", async () => {
    clearEmploymentGenderCache();
    let calls = 0;
    const fetcher = async () => { calls += 1; return workbook(); };
    const live = await loadEmploymentGender({ fetcher, fromYear: 2024, toYear: 2024 });
    const cached = await loadEmploymentGender({ fetcher, fromYear: 2024, toYear: 2024, gender: "female" });

    expect(live.meta).toMatchObject({ delivery: "live", returned_observations: 2 });
    expect(cached.meta).toMatchObject({ delivery: "cache", returned_observations: 1 });
    expect(cached.report.observations).toEqual([{ year: 2024, gender: "female", value: 0.14187283284293503, unit: "ratio" }]);
    expect(calls).toBe(1);

    clearEmploymentGenderCache();
    const fallback = await loadEmploymentGender({ fetcher: async () => { throw new Error("upstream unavailable"); } });
    expect(fallback.report.scope.returnedObservations).toBe(10);
    expect(fallback.report.source).toMatchObject({
      delivery: "verified_snapshot",
      sha256: EMPLOYMENT_GENDER_SNAPSHOT_META.sha256,
    });
    expect(fallback.meta).toMatchObject({
      delivery: "verified_snapshot",
      sha256: EMPLOYMENT_GENDER_SNAPSHOT_META.sha256,
      upstream_error: "upstream unavailable",
      returned_observations: 10,
    });
    expect(fallback.meta.data_quality).toMatchObject({ confidence: "high" });
    expect(fallback.report.limitations.join(" ")).toContain("complete retained snapshot");
  });
});
