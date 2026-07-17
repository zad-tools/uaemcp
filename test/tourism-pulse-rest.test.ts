import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

describe("UAE Tourism Pulse REST contract", () => {
  it("returns a filtered, source-cited snapshot envelope when live delivery is unavailable", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/tourism-pulse?metric=occupancy_rate&from_year=2024&to_year=2025"), { fetchTourismWorkbook: async () => { throw new Error("blocked"); } });
    const payload = await response!.json();
    expect(response?.status).toBe(200);
    expect(payload.data).toMatchObject({ kind: "uae_tourism_pulse_2014_2025", scope: { metric: "occupancy_rate", fromYear: 2024, toYear: 2025, returnedObservations: 2 }, series: [{ metric: "occupancy_rate", unit: "ratio" }] });
    expect(payload.meta).toMatchObject({ source_id: "moet_tourism_2014_2025", delivery: "verified_snapshot", filters: { metric: "occupancy_rate", from_year: 2024, to_year: 2025 }, units_kept_separate: true, causal_interpretation: false });
  });

  it("rejects unknown metrics, out-of-range years and reversed ranges", async () => {
    expect((await handleRest(new Request("http://localhost/api/v1/tourism-pulse?metric=revenue")))?.status).toBe(422);
    expect((await handleRest(new Request("http://localhost/api/v1/tourism-pulse?from_year=2013")))?.status).toBe(422);
    expect((await handleRest(new Request("http://localhost/api/v1/tourism-pulse?from_year=2025&to_year=2024")))?.status).toBe(422);
  });
});
