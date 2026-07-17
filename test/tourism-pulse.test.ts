import { describe, expect, it } from "bun:test";
import { strToU8, zipSync } from "fflate";
import {
  buildTourismPulse,
  clearTourismPulseCache,
  loadTourismPulse,
  parseTourismWorkbook,
  TOURISM_SNAPSHOT_META,
} from "../src/tourism-pulse.js";

const xml = (rows: ReadonlyArray<ReadonlyArray<string | number>>): string =>
  `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, rowIndex) =>
    `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => {
      const reference = `${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}`;
      return typeof value === "number"
        ? `<c r="${reference}"><v>${value}</v></c>`
        : `<c r="${reference}" t="inlineStr"><is><t>${value}</t></is></c>`;
    }).join("")}</row>`,
  ).join("")}</sheetData></worksheet>`;

function workbook(): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const annual = (header: string, first: number, last: number): ReadonlyArray<ReadonlyArray<string | number>> => [
    ["title"],
    ["Year", header],
    ...Array.from({ length: 12 }, (_, index) => [2014 + index, index === 0 ? first : index === 11 ? last : first + index]),
  ];
  const sheets: ReadonlyArray<ReadonlyArray<ReadonlyArray<string | number>>> = [
    [["metadata"]],
    [["definitions"]],
    annual("Hotel Guest Arrivals (M)", 19.7, 32.3),
    annual("Guest Nights (M)", 63.7, 110.6),
    annual("No.Hotel Establishments", 1027, 1257),
    annual("No. Rooms", 141396, 216864),
    annual("Occupancy Rate %", 0.62, 0.795),
  ];
  sheets.forEach((rows, index) => { files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(xml(rows)); });
  files["[Content_Types].xml"] = strToU8("<Types/>");
  return zipSync(files);
}

describe("UAE Tourism Pulse", () => {
  it("parses the five official metric sheets with explicit source-native units", () => {
    const observations = parseTourismWorkbook(workbook());

    expect(observations).toHaveLength(60);
    expect(observations[0]).toEqual({ metric: "hotel_guest_arrivals", year: 2014, value: 19.7, unit: "million guests", sheet: 3 });
    expect(observations.at(-1)).toEqual({ metric: "occupancy_rate", year: 2025, value: 0.795, unit: "ratio", sheet: 7 });
  });

  it("filters immutably by metric and inclusive year bounds", () => {
    const observations = parseTourismWorkbook(workbook());
    const before = structuredClone(observations);
    const report = buildTourismPulse(observations, {
      metric: "hotel_rooms",
      fromYear: 2020,
      toYear: 2025,
      citation: "https://www.moet.gov.ae/en/web/guest/moec-opendata",
      fetchedAt: "2026-07-18T00:00:00Z",
    });

    expect(report.series[0]).toMatchObject({ metric: "hotel_rooms", label: { en: "Hotel rooms", ar: "الغرف الفندقية" }, unit: "rooms" });
    expect(report.series[0]?.observations.map(({ year }) => year)).toEqual([2020, 2021, 2022, 2023, 2024, 2025]);
    expect(report.series[0]?.observations.at(-1)).toEqual({ year: 2025, value: 216864 });
    expect(report.scope).toMatchObject({ metric: "hotel_rooms", fromYear: 2020, toYear: 2025, returnedObservations: 6 });
    expect(report.limitations.join(" ")).toContain("national annual aggregates");
    expect(observations).toEqual(before);
  });

  it("caches a complete live workbook and falls back to the SHA-verified snapshot", async () => {
    clearTourismPulseCache();
    let calls = 0;
    const fetcher = async () => { calls += 1; return workbook(); };
    const first = await loadTourismPulse({ fetcher });
    const second = await loadTourismPulse({ fetcher });

    expect(first.meta.delivery).toBe("live");
    expect(second.meta.delivery).toBe("cache");
    expect(calls).toBe(1);

    clearTourismPulseCache();
    const fallback = await loadTourismPulse({ fetcher: async () => { throw new Error("blocked"); }, metric: "occupancy_rate" });
    expect(fallback.meta).toMatchObject({ delivery: "verified_snapshot", sha256: TOURISM_SNAPSHOT_META.sha256, upstream_error: "blocked" });
    expect(fallback.report.series[0]?.observations).toHaveLength(12);
    expect(fallback.report.source.delivery).toBe("verified_snapshot");
  });
});
