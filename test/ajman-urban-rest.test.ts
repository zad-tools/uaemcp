import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

const fixture = async (_source: unknown, options: { dataset?: string | null } = {}) => ({
  records: [{ year: 2024, value: 1, building_licenses_issued_classified_by_license_type_in_the_emirate_of_ajman: 1, total_of_certified_rent_contracts_in_ajman_city: 1, total_of_certified_rent_contracts_in_masfout_city: 1, the_length_of_the_new_road_added_in_the_emirate_km: 1, total_number_of_developed_crossroads: 1 }],
  source_id: "ajman_data_portal", dataset: options.dataset ?? null, total: 1, fetched_at: "2026-07-17T00:00:00Z", citation: "https://data.ajman.ae", license: "open", fields: [], data_quality: { quality_score: 0.9 },
} as any);

describe("Ajman Urban Evidence REST contract", () => {
  it("publishes six cited source-native views", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/ajman-urban?limit=100"), { fetchAjmanUrbanRecords: fixture });
    const payload = await response?.json();
    expect(response?.status).toBe(200);
    expect(payload.data).toMatchObject({ kind: "ajman_urban_evidence", geography: { emirate: "Ajman" } });
    expect(payload.data.scope.datasets).toHaveLength(6);
  });
});
