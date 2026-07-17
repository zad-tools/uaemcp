import { beforeEach, describe, expect, it } from "bun:test";
import { SETTINGS } from "../src/config.js";
import { checkRateLimit, clearRateLimits } from "../src/rate-limit.js";

describe("rate limiting", () => {
  beforeEach(clearRateLimits);

  it("limits repeated requests per forwarded client", () => {
    const previous = SETTINGS.rateLimitPerMinute;
    SETTINGS.rateLimitPerMinute = 2;
    try {
      const request = new Request("http://localhost/mcp", { headers: { "x-forwarded-for": "203.0.113.7" } });
      expect(checkRateLimit(request, 1000).allowed).toBe(true);
      expect(checkRateLimit(request, 1000).allowed).toBe(true);
      expect(checkRateLimit(request, 1000).allowed).toBe(false);
    } finally {
      SETTINGS.rateLimitPerMinute = previous;
    }
  });

  it("can be disabled for trusted private deployments", () => {
    const previous = SETTINGS.rateLimitPerMinute;
    SETTINGS.rateLimitPerMinute = 0;
    try {
      expect(checkRateLimit(new Request("http://localhost/mcp")).allowed).toBe(true);
    } finally {
      SETTINGS.rateLimitPerMinute = previous;
    }
  });
});
