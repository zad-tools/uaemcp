import { describe, expect, test } from "bun:test";
import { UaemcpClient, UaemcpClientError } from "../src/client.js";

describe("TypeScript client", () => {
  test("builds encoded, typed read requests", async () => {
    let requested = "";
    const fetcher = (async (input: RequestInfo | URL) => {
      requested = String(input);
      return Response.json({ ok: true, data: { sources: [] }, error: null, meta: {} });
    }) as typeof fetch;
    const client = new UaemcpClient({ baseUrl: "https://example.test/", fetch: fetcher });
    const result = await client.search("عقارات دبي", { deep: true, limit: 5 });
    expect(result.ok).toBe(true);
    expect(requested).toContain("q=%D8%B9%D9%82%D8%A7%D8%B1%D8%A7%D8%AA+%D8%AF%D8%A8%D9%8A");
    expect(requested).toContain("deep=true");
  });

  test("adds write token and exposes structured errors", async () => {
    let token = "";
    const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      token = new Headers(init?.headers).get("x-api-key") ?? "";
      return Response.json({ ok: false, data: null, error: { code: "NOT_FOUND", message: "missing" }, meta: {} }, { status: 404 });
    }) as typeof fetch;
    const client = new UaemcpClient({ apiKey: "secret", fetch: fetcher });
    await expect(client.source("missing")).rejects.toBeInstanceOf(UaemcpClientError);
    expect(token).toBe("secret");
  });
});
