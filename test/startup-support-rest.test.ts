import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

describe("Startup Support REST contract", () => {
  it("lists and matches non-identifying founder needs", async () => {
    const catalogue = await handleRest(new Request("http://localhost/api/v1/startup-support"));
    expect(catalogue?.status).toBe(200);
    expect((await catalogue?.json()).data.programs.length).toBeGreaterThanOrEqual(8);
    const response = await handleRest(new Request("http://localhost/api/v1/startup-support/match", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ stage: "mvp", supportType: "mentorship", emirate: "sharjah" }) }));
    const body = await response?.json();
    expect(response?.status).toBe(200);
    expect(body.meta).toMatchObject({ stored: false, decision: "discovery_only" });
  });

  it("rejects identifying and unknown fields", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/startup-support/match", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ stage: "idea", supportType: "incubation", emirate: "dubai", phone: "+971500000000" }) }));
    expect(response?.status).toBe(422);
  });
});
