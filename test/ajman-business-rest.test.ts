import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

const fixture = async (_source: unknown, options: { dataset?: string | null } = {}) => ({
  records: options.dataset === "license-in-ajman-activities"
    ? [{ activitiyen: "Software Design", activitiyar: "تصميم البرمجيات", startdate: "2025-01-01" }]
    : options.dataset === "license-in-ajman-area"
      ? [{ areaen: "Rawdha 3", areaar: "الروضة 3", startdate: "2025-02-01" }]
      : [{ license_type: "Commercial", company_status: "Active", license_state_date: "2025-03-01" }],
  source_id: "ajman_data_portal", dataset: options.dataset ?? null, total: 100,
  fetched_at: "2026-07-17T00:00:00Z", citation: "https://data.ajman.ae", license: "open", fields: [],
  data_quality: { quality_score: 0.9 },
} as any);

describe("Ajman Business Evidence REST contract", () => {
  it("publishes a bounded, cited three-dataset report", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/ajman-business?limit=50&q=software"), { fetchAjmanBusinessRecords: fixture });
    const payload = await response?.json();
    expect(response?.status).toBe(200);
    expect(payload.data).toMatchObject({ kind: "ajman_business_evidence", geography: { emirate: "Ajman" } });
    expect(payload.data.scope.datasets).toHaveLength(3);
    expect(payload.meta).toMatchObject({ source_id: "ajman_data_portal", requested_limit_per_dataset: 50, query: "software" });
  });

  it("rejects invalid limits", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/ajman-business?limit=0"));
    expect(response?.status).toBe(422);
  });
});
