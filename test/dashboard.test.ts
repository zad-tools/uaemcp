import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock the network layer so concurrency/timeout/cache are testable offline.
const mockCheck = mock();
mock.module("../src/connectors.js", () => ({ checkHealth: mockCheck }));

import { SETTINGS } from "../src/config.js";
const { _clearCache, buildDashboardSummary } = await import("../src/dashboard.js");

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    (t as { unref?: () => void }).unref?.();
  });

function okAfter(delayMs: number) {
  return async (source: { id: string; base_url: string }) => {
    await sleep(delayMs);
    return {
      source_id: source.id,
      status: "ok" as const,
      message: "stub",
      checked_url: source.base_url,
      record_count: 1,
      latency_ms: delayMs,
    };
  };
}

describe("buildDashboardSummary", () => {
  beforeEach(() => {
    _clearCache();
    mockCheck.mockReset();
    SETTINGS.healthTimeoutMs = 5000;
  });

  it("runs checks concurrently, not sequentially", async () => {
    mockCheck.mockImplementation(okAfter(150));
    const started = Date.now();
    const summary = await buildDashboardSummary({ useCache: false });
    const elapsed = Date.now() - started;
    expect(summary.total_sources).toBeGreaterThanOrEqual(10);
    // Concurrent: well under the sequential worst case (n * 150ms).
    expect(elapsed).toBeLessThan(summary.total_sources * 150 * 0.5);
    expect(summary.status_counts.ok).toBe(summary.total_sources);
  });

  it("marks a hanging source down within the per-source timeout", async () => {
    SETTINGS.healthTimeoutMs = 80;
    mockCheck.mockImplementation(okAfter(60_000)); // never resolves in time
    const summary = await buildDashboardSummary({ useCache: false });
    expect(summary.status_counts.down).toBe(summary.total_sources);
  });

  it("serves the second call from cache", async () => {
    mockCheck.mockImplementation(okAfter(20));
    const first = await buildDashboardSummary({ useCache: true, now: 1000 });
    expect(first.cached).toBe(false);
    const second = await buildDashboardSummary({ useCache: true, now: 1500 });
    expect(second.cached).toBe(true);
  });
});
