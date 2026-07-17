import { describe, expect, it } from "bun:test";
import { buildServer } from "../src/server.js";

describe("Startup Support MCP product", () => {
  it("registers a read-only discovery tool", () => {
    expect((buildServer() as any)._registeredTools.uae_startup_support).toBeDefined();
  });
});
