import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

describe("Business Setup REST contract", () => {
  it("publishes the catalogue and routes bounded non-identifying input", async () => {
    const catalogue = await handleRest(new Request("http://localhost/api/v1/business-setup"));
    expect(catalogue?.status).toBe(200);
    expect((await catalogue?.json()).data.mainlandAuthorities).toHaveLength(7);
    const response = await handleRest(new Request("http://localhost/api/v1/business-setup/route", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ emirate: "ajman", setupType: "mainland", activitySector: "commercial" }) }));
    const payload = await response?.json();
    expect(response?.status).toBe(200);
    expect(payload.data.primaryRoute.url).toContain("ajmanded.ae");
    expect(payload.meta).toMatchObject({ stored: false, decision: "routing_only" });
  });

  it("rejects identifiers and unknown fields", async () => {
    for (const body of [{ emirate: "dubai", setupType: "mainland", email: "a@example.com" }, { emirate: "invalid", setupType: "mainland" }]) {
      const response = await handleRest(new Request("http://localhost/api/v1/business-setup/route", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
      expect(response?.status).toBe(422);
    }
  });
});
