import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

const page = `<html><body><table><tr><td>16 JUL 2026</td><td>23 JUL 2026<br>23 JUL 2026</td><td>23 JUL 2026<br>03 SEP 2026</td><td>SUP 24/2026<br>AIRAC AMDT 09/2026</td></tr></table></body></html>`;

describe("GCAA Aeronautical Publications REST contract", () => {
  it("returns a bounded discovery-only envelope with source-native dates", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/aeronautical-publications?kind=supplement&limit=1"), { fetchAeronauticalPublicationsPage: async () => page });
    const payload = await response!.json();
    expect(response?.status).toBe(200);
    expect(payload.data).toMatchObject({ kind: "uae_aeronautical_publications", scope: { parsed: 2, matched: 1, returned: 1 }, publications: [{ kind: "supplement", description: "SUP 24/2026" }] });
    expect(payload.meta).toMatchObject({ delivery: "live", filters: { kind: "supplement", limit: 1 }, decision: "discovery_only", operational_use: false });
  });

  it("rejects unknown kinds and unsafe limits at the public boundary", async () => {
    expect((await handleRest(new Request("http://localhost/api/v1/aeronautical-publications?kind=notam")))?.status).toBe(422);
    expect((await handleRest(new Request("http://localhost/api/v1/aeronautical-publications?limit=51")))?.status).toBe(422);
  });
});
