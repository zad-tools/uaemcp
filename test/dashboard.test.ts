import { beforeEach, describe, expect, it } from "bun:test";

import { SETTINGS } from "../src/config.js";
import { _clearCache, buildDashboardSummary } from "../src/dashboard.js";

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
    SETTINGS.healthTimeoutMs = 5000;
  });

  it("runs checks concurrently, not sequentially", async () => {
    const started = Date.now();
    const summary = await buildDashboardSummary({ useCache: false, healthCheck: okAfter(150) });
    const elapsed = Date.now() - started;
    expect(summary.total_sources).toBeGreaterThanOrEqual(10);
    // Concurrent: well under the sequential worst case (n * 150ms).
    expect(elapsed).toBeLessThan(summary.total_sources * 150 * 0.5);
    expect(summary.status_counts.ok).toBe(summary.total_sources);
  });

  it("marks a hanging source down within the per-source timeout", async () => {
    SETTINGS.healthTimeoutMs = 80;
    const summary = await buildDashboardSummary({ useCache: false, healthCheck: okAfter(60_000) });
    expect(summary.status_counts.down).toBe(summary.total_sources);
  });

  it("serves the second call from cache", async () => {
    const healthCheck = okAfter(20);
    const first = await buildDashboardSummary({ useCache: true, now: 1000, healthCheck });
    expect(first.cached).toBe(false);
    const second = await buildDashboardSummary({ useCache: true, now: 1500, healthCheck });
    expect(second.cached).toBe(true);
  });

  it("serves stale health immediately while one background refresh runs", async () => {
    const previousTtl = SETTINGS.cacheTtlMs;
    SETTINGS.cacheTtlMs = 20;
    let calls = 0;
    const healthCheck = async (source: { id: string; base_url: string }) => {
      calls += 1;
      await sleep(120);
      return {
        source_id: source.id,
        status: "ok" as const,
        message: "stub",
        checked_url: source.base_url,
        record_count: 1,
        latency_ms: 120,
      };
    };

    try {
      const first = await buildDashboardSummary({ useCache: true, now: 1_000, healthCheck });
      const callsAfterWarmup = calls;
      const started = Date.now();
      const stale = await buildDashboardSummary({ useCache: true, now: 1_021, healthCheck });
      const duplicate = await buildDashboardSummary({ useCache: true, now: 1_022, healthCheck });

      expect(Date.now() - started).toBeLessThan(50);
      expect(stale.cached).toBe(true);
      expect((stale as any).freshness).toMatchObject({ cacheState: "stale", refreshing: true, ageMs: 21 });
      expect((duplicate as any).freshness).toMatchObject({ cacheState: "stale", refreshing: true });
      expect(calls).toBe(callsAfterWarmup + first.total_sources);
    } finally {
      SETTINGS.cacheTtlMs = previousTtl;
    }
  });
});
