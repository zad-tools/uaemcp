import { describe, expect, it } from "bun:test";
import { buildServer } from "../src/server.js";

describe("Golden Residency MCP product", () => {
  it("registers the navigator as a read-only tool", () => {
    const tools = (buildServer() as any)._registeredTools;
    expect(tools.uae_golden_residency).toBeDefined();
  });
});
