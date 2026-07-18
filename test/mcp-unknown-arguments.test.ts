import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";

let server: Bun.Server<unknown>;
let baseUrl: string;

beforeAll(() => {
  server = runHttp("127.0.0.1", 0);
  baseUrl = server.url.toString().replace(/\/$/, "");
});
afterAll(() => server.stop(true));

const rpc = async (method: string, params: Record<string, unknown>) => fetch(`${baseUrl}/mcp`, {
  method: "POST",
  headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
}).then((response) => response.json());

const call = (arguments_: Record<string, unknown>) => rpc("tools/call", { name: "uae_products_list", arguments: arguments_ });

describe("global MCP tool argument contract", () => {
  it("rejects unknown arguments instead of silently stripping them", async () => {
    const payload = await call({ unexpected: true });

    expect(payload.result.isError).toBe(true);
    expect(payload.result.content[0].text).toContain("MCP error -32602");
    expect(payload.result.content[0].text).toContain("unexpected");

    const listed = await rpc("tools/list", {});
    expect(listed.result.tools.every((tool: { inputSchema: { additionalProperties?: boolean } }) => tool.inputSchema.additionalProperties === false)).toBe(true);
  });

  it("continues to execute a valid call", async () => {
    const payload = await call({});
    const result = JSON.parse(payload.result.content[0].text);

    expect(payload.error).toBeUndefined();
    expect(result).toMatchObject({ ok: true, meta: { total: 24, published: 24 } });
  });

  it("rejects the reported health indicator argument instead of returning all records", async () => {
    const payload = await rpc("tools/call", {
      name: "uae_health_indicators",
      arguments: { indicator: "nonexistent_xyz" },
    });

    expect(payload.result.isError).toBe(true);
    expect(payload.result.content[0].text).toContain("MCP error -32602");
    expect(payload.result.content[0].text).toContain("indicator");
  });
});
