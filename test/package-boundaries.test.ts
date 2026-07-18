import { describe, expect, it } from "bun:test";
import contractsPackage from "../packages/contracts/package.json";
import sdkPackage from "../packages/sdk/package.json";
import mcpPackage from "../packages/mcp/package.json";
import { parseEnvelope, parseToolCatalog } from "../packages/contracts/src/index.js";
import {
  OpenEmiratesClient,
  OpenEmiratesToolValidationError,
  type OpenEmiratesToolArguments,
} from "../packages/sdk/src/index.js";

const jsonResponse = (payload: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(payload, { status, headers });

describe("Open Emirates package boundaries", () => {
  it("keeps contracts dependency-free and the SDK unaware of MCP", () => {
    expect(contractsPackage.name).toBe("@open-emirates/contracts");
    expect("dependencies" in contractsPackage).toBe(false);
    expect(sdkPackage.name).toBe("@open-emirates/sdk");
    expect(sdkPackage.dependencies).toMatchObject({
      "@open-emirates/contracts": "0.2.0",
      ajv: "8.20.0",
    });
    expect(JSON.stringify(sdkPackage)).not.toContain("modelcontextprotocol");
    expect(mcpPackage.name).toBe("@open-emirates/mcp");
    expect(mcpPackage.bin).toHaveProperty("open-emirates-mcp");
  });

  it("validates the stable envelope at the contract seam", () => {
    expect(parseEnvelope({ ok: true, data: [1], error: null, meta: {} }).data).toEqual([1]);
    expect(() => parseEnvelope({ data: [] })).toThrow("Invalid Open Emirates response envelope");
  });

  it("validates the runtime tool catalogue at the contract seam", () => {
    const catalogue = parseToolCatalog({
      schemaVersion: "2.1",
      serverVersion: "1.82.0",
      generatedFrom: "runtime_registered_tools",
      summary: { total: 0, read: 0, write: 0, mixed: 0 },
      tools: [],
    });
    expect(catalogue.schemaVersion).toBe("2.1");
    expect(() => parseToolCatalog({ tools: [] })).toThrow("Invalid Open Emirates tool catalog");
  });

  it("retries transient failures and returns typed envelopes", async () => {
    let calls = 0;
    const client = new OpenEmiratesClient({
      retries: 1,
      retryDelayMs: 0,
      fetch: async () => {
        calls += 1;
        return calls === 1
          ? jsonResponse({ ok: false, data: null, error: { code: "busy", message: "Busy" }, meta: {} }, 503)
          : jsonResponse({ ok: true, data: [{ id: "moiat" }], error: null, meta: {} });
      },
    });

    const result = await client.sources<{ id: string }[]>();
    expect(calls).toBe(2);
    expect(result.data[0]?.id).toBe("moiat");
  });

  it("paginates records with an explicit page bound", async () => {
    const offsets: number[] = [];
    const client = new OpenEmiratesClient({
      fetch: async (input) => {
        const offset = Number(new URL(String(input)).searchParams.get("offset"));
        offsets.push(offset);
        const data = offset === 0 ? [{ id: 1 }, { id: 2 }] : [{ id: 3 }];
        return jsonResponse({ ok: true, data, error: null, meta: {} });
      },
    });

    const records: Array<{ id: number }> = [];
    for await (const page of client.recordPages<{ id: number }>("source", { pageSize: 2, maxPages: 3 })) {
      records.push(...page.data);
    }
    expect(offsets).toEqual([0, 2]);
    expect(records).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it("discovers, caches, validates and invokes runtime MCP tools", async () => {
    const searchTool = {
      name: "uae_search",
      title: "Search",
      kind: "read",
      description: "Search the bounded official UAE source catalogue.",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: { query: { type: "string", minLength: 2 } },
        additionalProperties: false,
      },
      outputSchema: { type: "object", required: ["ok", "data", "error", "meta"] },
      exampleArguments: { query: "Dubai" },
      limitations: ["Bounded official-source search."],
      since: null,
      stability: "stable",
      deprecated: false,
      idempotent: true,
      sideEffects: false,
      authScopes: [],
      requiresAuth: false,
      browserPlayable: true,
      execution: { timeoutMs: 15_000, maxResultBytes: 1_000_000 },
    } as const;
    const catalog = {
      schemaVersion: "2.1",
      serverVersion: "1.82.0",
      generatedFrom: "runtime_registered_tools",
      summary: { total: 1, read: 1, write: 0, mixed: 0 },
      tools: [searchTool],
    } as const;
    const requests: Array<{ method: string; path: string }> = [];
    const client = new OpenEmiratesClient({
      retries: 0,
      fetch: async (input, init) => {
        const url = new URL(String(input));
        requests.push({ method: init?.method ?? "GET", path: url.pathname });
        if (url.pathname === "/api/v1/tools") return jsonResponse({ ok: true, data: catalog, error: null, meta: {} });
        return jsonResponse({ ok: true, data: [{ source_id: "dubai_pulse" }], error: null, meta: { tool: "uae_search" } });
      },
    });

    const typedArguments: OpenEmiratesToolArguments["uae_search"] = { query: "Dubai" };
    expect((await client.tools.list()).tools[0]?.name).toBe("uae_search");
    expect((await client.tools.get("uae_search")).exampleArguments).toEqual({ query: "Dubai" });
    await expect(client.tools.call("uae_search", {} as OpenEmiratesToolArguments["uae_search"]))
      .rejects.toBeInstanceOf(OpenEmiratesToolValidationError);
    const result = await client.tools.call("uae_search", typedArguments);
    expect(result.data).toEqual([{ source_id: "dubai_pulse" }]);
    expect(requests).toEqual([
      { method: "GET", path: "/api/v1/tools" },
      { method: "POST", path: "/api/v1/tools/uae_search/call" },
    ]);
  });
});
