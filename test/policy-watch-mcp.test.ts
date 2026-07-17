import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";
import { PolicyEvidenceStore } from "../src/policy-evidence-watch.js";

let server: Bun.Server<unknown>;
let baseUrl: string;

beforeAll(() => {
  server = runHttp("127.0.0.1", 0, {
    policyEvidenceStore: new PolicyEvidenceStore(),
    fetchPolicyPage: async () => "<html><body><h1>Official index</h1><p>Published content</p></body></html>",
  });
  baseUrl = server.url.toString().replace(/\/$/, "");
});
afterAll(() => server.stop(true));

describe("Policy Evidence Watch MCP contract", () => {
  it("checks an allowlisted official page and returns the retained report without hidden fetches", async () => {
    const call = async (args: Record<string, unknown>) => {
      const response = await fetch(`${baseUrl}/mcp`, { method: "POST", headers: { accept: "application/json, text/event-stream", "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "uae_policy_evidence_watch", arguments: args } }) });
      const payload = await response.json();
      return JSON.parse(payload.result.content[0].text);
    };
    const checked = await call({ action: "check", source_ids: ["fta_legislation_index"] });
    const report = await call({ action: "report" });
    expect(checked.data).toMatchObject({ summary: { requested: 1, baseline: 1 }, changes: [{ changeType: "first_snapshot" }] });
    expect(report.data.sources.find(({ id }: { id: string }) => id === "fta_legislation_index")).toMatchObject({ status: "unchanged" });
    expect(report.meta).toMatchObject({ hidden_upstream_work: false });
  });
});
