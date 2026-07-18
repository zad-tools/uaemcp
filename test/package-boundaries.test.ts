import { describe, expect, it } from "bun:test";
import contractsPackage from "../packages/contracts/package.json";
import sdkPackage from "../packages/sdk/package.json";
import mcpPackage from "../packages/mcp/package.json";
import { parseEnvelope } from "../packages/contracts/src/index.js";
import { OpenEmiratesClient } from "../packages/sdk/src/index.js";

const jsonResponse = (payload: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(payload, { status, headers });

describe("Open Emirates package boundaries", () => {
  it("keeps contracts dependency-free and the SDK unaware of MCP", () => {
    expect(contractsPackage.name).toBe("@open-emirates/contracts");
    expect("dependencies" in contractsPackage).toBe(false);
    expect(sdkPackage.name).toBe("@open-emirates/sdk");
    expect(sdkPackage.dependencies).toEqual({ "@open-emirates/contracts": "0.1.0" });
    expect(JSON.stringify(sdkPackage)).not.toContain("modelcontextprotocol");
    expect(mcpPackage.name).toBe("@open-emirates/mcp");
    expect(mcpPackage.bin).toHaveProperty("open-emirates-mcp");
  });

  it("validates the stable envelope at the contract seam", () => {
    expect(parseEnvelope({ ok: true, data: [1], error: null, meta: {} }).data).toEqual([1]);
    expect(() => parseEnvelope({ data: [] })).toThrow("Invalid Open Emirates response envelope");
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
});
