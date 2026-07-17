import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";

let server: Bun.Server<unknown>;
let baseUrl: string;

beforeAll(() => {
  server = runHttp("127.0.0.1", 0);
  baseUrl = server.url.toString().replace(/\/$/, "");
});

afterAll(() => server.stop(true));

describe("REST v1", () => {
  it("serves a useful landing page", async () => {
    const response = await fetch(`${baseUrl}/`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Open Emirates Intelligence");
  });

  it("lists sources using the stable envelope", async () => {
    const response = await fetch(`${baseUrl}/api/v1/sources`);
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data).toHaveLength(32);
    expect(payload.meta.total).toBe(32);
  });

  it("returns structured errors", async () => {
    const response = await fetch(`${baseUrl}/api/v1/sources/not-real`);
    const payload = await response.json();
    expect(response.status).toBe(404);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("NOT_FOUND");
  });

  it("supports bilingual catalog search", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=عجمان`);
    const payload = await response.json();
    expect(payload.data.sources[0].source_id).toBe("ajman_data_portal");
  });

  it("keeps writes disabled without a token", async () => {
    const response = await fetch(`${baseUrl}/api/v1/sources`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(401);
  });

  it("publishes conservative coverage and unified catalog models", async () => {
    const coverage = await fetch(`${baseUrl}/api/v1/coverage`).then((response) => response.json());
    const catalog = await fetch(`${baseUrl}/api/v1/catalog`).then((response) => response.json());
    expect(coverage.data.liveRecordConnectors).toBe(2);
    expect(catalog.data[0].type).toBe("portal");
    expect(catalog.data[0].capabilities).toBeDefined();
  });

  it("publishes a machine-readable trust manifest", async () => {
    const response = await fetch(`${baseUrl}/.well-known/uaemcp.json`);
    const manifest = await response.json();
    expect(manifest.server).toMatchObject({ runtime: "bun", version: "1.29.0" });
    expect(manifest.tools.write).toEqual(["uae_source_add_metadata"]);
    expect(manifest.dataPolicy.fabricationAllowed).toBe(false);
  });
});
