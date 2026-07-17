import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

describe("Ajman Parks Footfall REST contract", () => {
  it("returns source-bounded visit evidence", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/ajman-parks"), { fetchAjmanParksRecords: (async () => ({ records: [{ year: 2023, month_en: "January", month_ar: "يناير", park_name_en: "A", park_name_ar: "أ", numne_of_parks_visitors: "12" }], total: 1, fetched_at: "2026-05-13T10:47:26.040Z", citation: "https://data.ajman.ae/explore/dataset/parks-visitors-in-ajman/", license: "CC BY 4.0", data_quality: {} })) as never });
    const payload = await response?.json();
    expect(response?.status).toBe(200);
    expect(payload.data).toMatchObject({ kind: "ajman_parks_footfall", delivery: "live", summary: { publishedVisitObservations: 12 } });
    expect(payload.data.methodology.uniquePeople).toBe(false);
  });
});
