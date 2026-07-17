import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";
import { PolicyEvidenceStore } from "../src/policy-evidence-watch.js";

const page = (text: string) => `<html><body><main><h1>Official policy page</h1><p>${text}</p></main></body></html>`;

describe("Policy Evidence Watch REST contract", () => {
  it("returns retained state without hidden upstream work and performs a bounded check", async () => {
    const store = new PolicyEvidenceStore();
    let calls = 0;
    const dependencies = { policyEvidenceStore: store, fetchPolicyPage: async () => { calls += 1; return page("Published content"); } };
    const before = await handleRest(new Request("http://localhost/api/v1/policy-watch"), dependencies);
    const beforeBody = await before!.json();
    expect(calls).toBe(0);
    expect(beforeBody.data.summary).toMatchObject({ requested: 5, checked: 0, unavailable: 5 });

    const checked = await handleRest(new Request("http://localhost/api/v1/policy-watch/check", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceIds: ["fta_legislation_index"] }),
    }), dependencies);
    const body = await checked!.json();
    expect(checked?.status).toBe(200);
    expect(calls).toBe(1);
    expect(body.data).toMatchObject({ summary: { requested: 1, checked: 1, baseline: 1 }, sources: [{ id: "fta_legislation_index", status: "unchanged" }] });
    expect(body.meta).toMatchObject({ cached: false, stores_user_data: false, stores_page_evidence: true });
  });

  it("rejects unknown fields, duplicate ids and non-allowlisted sources", async () => {
    for (const body of [
      { sourceIds: [] },
      { sourceIds: ["fta_legislation_index", "fta_legislation_index"] },
      { sourceIds: ["unknown"] },
      { sourceIds: ["fta_legislation_index"], url: "http://127.0.0.1" },
    ]) {
      const response = await handleRest(new Request("http://localhost/api/v1/policy-watch/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { policyEvidenceStore: new PolicyEvidenceStore() });
      expect(response?.status).toBe(422);
    }
  });
});
