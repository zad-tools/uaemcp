import { describe, expect, it } from "bun:test";
import { buildServer } from "../src/server.js";

describe("Education Ledger MCP product", () => {
  it("registers an education evidence tool", async () => {
    const server = buildServer();
    const tools = (server as any)._registeredTools;
    expect(tools.uae_education_ledger).toBeDefined();
  });
});
