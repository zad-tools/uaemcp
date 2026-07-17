import { describe, expect, it } from "bun:test";
import { buildServer } from "../src/server.js";

describe("Founder Pathway MCP product", () => {
  it("registers a read-only planning tool", () => {
    expect((buildServer() as any)._registeredTools.uae_founder_pathway).toBeDefined();
  });
});
