import { describe, expect, it } from "bun:test";
import { buildHealthFacilitiesMap, parseCoordinator } from "../src/health-facilities-map.js";

const rows = [
  { "No.": 1, "Facility Name English": "Dubai Clinic", "Facility Name Arabic": "عيادة دبي", Coordinator: "25.2048,55.2708", "URL Link": "https://maps.example/1" },
  { "No.": 2, "Facility Name English": "Abu Dhabi Centre", "Facility Name Arabic": "مركز أبوظبي", Coordinator: "24.4539,54.3773", "URL Link": "https://maps.example/2" },
  { "No.": 3, "Facility Name English": "Missing Coordinate", "Facility Name Arabic": "بدون إحداثيات", Coordinator: null, "URL Link": "https://maps.example/3" },
];

describe("MOHAP Health Facilities GIS 2026", () => {
  it("parses bounded source coordinates and rejects malformed values", () => {
    expect(parseCoordinator("25.151,55.213")).toEqual({ latitude: 25.151, longitude: 55.213 });
    expect(parseCoordinator("90,90")).toBeNull();
    expect(parseCoordinator("25,60")).toBeNull();
    expect(parseCoordinator("91,55")).toBeNull();
    expect(parseCoordinator("25;55")).toBeNull();
    expect(parseCoordinator(null)).toBeNull();
  });

  it("returns only names and coordinates with honest source coverage", () => {
    const result = buildHealthFacilitiesMap(rows, { citation: "https://mohap.gov.ae", fetchedAt: "2026-07-18T00:00:00Z" });
    expect(result.kind).toBe("uae_health_facilities_gis");
    expect(result.scope).toMatchObject({ sourceRows: 3, geocodedRows: 2, omittedWithoutValidCoordinates: 1, excludedReasons: { blank: 1, sentinel: 0, malformedOrOutsideUae: 0 }, uniqueNamedCoordinates: 2, uniqueCoordinatePairs: 2, returned: 2 });
    expect(result.features[0]).toEqual({ id: 1, nameEn: "Dubai Clinic", nameAr: "عيادة دبي", latitude: 25.2048, longitude: 55.2708 });
    expect(result.limitations.join(" ")).toContain("does not establish facility type, licensing status, service quality or capacity");
  });

  it("supports bilingual search, bounding boxes, radius and a bounded limit", () => {
    expect(buildHealthFacilitiesMap(rows, { citation: "x", fetchedAt: "x", q: "أبوظبي" }).features.map(({ id }) => id)).toEqual([2]);
    expect(buildHealthFacilitiesMap(rows, { citation: "x", fetchedAt: "x", bbox: [55, 25, 56, 26] }).features.map(({ id }) => id)).toEqual([1]);
    expect(buildHealthFacilitiesMap(rows, { citation: "x", fetchedAt: "x", near: [25.2048, 55.2708, 1] }).features[0]).toMatchObject({ id: 1, distanceKm: 0 });
    expect(buildHealthFacilitiesMap(rows, { citation: "x", fetchedAt: "x", limit: 1 }).features).toHaveLength(1);
  });

  it("validates spatial filters and never mutates source rows", () => {
    const before = structuredClone(rows);
    expect(() => buildHealthFacilitiesMap(rows, { citation: "x", fetchedAt: "x", bbox: [56, 25, 55, 26] })).toThrow("bbox");
    expect(() => buildHealthFacilitiesMap(rows, { citation: "x", fetchedAt: "x", near: [25, 55, 0] })).toThrow("radius");
    expect(() => buildHealthFacilitiesMap(rows, { citation: "x", fetchedAt: "x", limit: 1001 })).toThrow("limit");
    expect(rows).toEqual(before);
  });
});
