import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

describe("Founder Pathway REST contract", () => {
  it("creates a planning-only journey", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/founder-pathway", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage: "idea", emirate: "sharjah", setupType: "unsure", supportType: "mentorship" }),
    }));
    const body = await response?.json();
    expect(response?.status).toBe(200);
    expect(body.meta).toMatchObject({ stored: false, decision: "planning_only" });
    expect(body.data.steps).toHaveLength(3);
  });

  it("rejects identifying fields", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/founder-pathway", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage: "idea", emirate: "dubai", setupType: "mainland", supportType: "mentorship", email: "founder@example.com" }),
    }));
    expect(response?.status).toBe(422);
  });
});
