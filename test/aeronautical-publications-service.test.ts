import { describe, expect, it } from "bun:test";
import { loadAeronauticalPublications } from "../src/aeronautical-publications-service.js";

const page = `<html><body><table><tr><td>16 JUL 2026</td><td>23 JUL 2026</td><td>03 SEP 2026</td><td>SUP 26/2026</td></tr></table></body></html>`;

describe("GCAA AIP publication service", () => {
  it("returns live parsed publications with provenance", async () => {
    const loaded = await loadAeronauticalPublications(async () => page, { limit: 1 });
    expect(loaded.meta).toMatchObject({ delivery: "live", partial: false });
    expect(loaded.data.publications[0]?.description).toBe("SUP 26/2026");
  });

  it("falls back to a verified retained index without returning false zero", async () => {
    const loaded = await loadAeronauticalPublications(async () => { throw new Error("blocked"); });
    expect(loaded.meta).toMatchObject({ delivery: "verified_snapshot", partial: true, upstream_error: "blocked" });
    expect(loaded.data.publications.length).toBeGreaterThan(0);
  });
});
