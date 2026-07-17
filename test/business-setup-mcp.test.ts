import { describe, expect, it } from "bun:test";
import { buildServer } from "../src/server.js";

describe("Business Setup MCP product", () => {
  it("registers the privacy-bounded routing tool", () => {
    const tools = (buildServer() as any)._registeredTools;
    expect(tools.uae_business_setup).toBeDefined();
  });
});
