import { beforeEach, describe, expect, it } from "bun:test";
import { _clearHealthIndicatorRuntimeCache, loadHealthIndicators } from "../src/health-indicators-service.js";
import { MOHAP_HEALTH_INDICATOR_SNAPSHOT } from "../src/health-indicators-snapshot.js";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("health indicator stale-while-revalidate", () => {
  beforeEach(() => _clearHealthIndicatorRuntimeCache());

  it("returns the verified snapshot immediately and refreshes live data once in the background", async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      await sleep(100);
      return {
        records: MOHAP_HEALTH_INDICATOR_SNAPSHOT.slice(0, 3) as any[],
        citation: "https://mohap.gov.ae/example.xlsx",
        fetched_at: "2026-07-18T08:00:00.000Z",
        total: 3,
        data_quality: { confidence: "high", warnings: [], validation: {}, quality_score: 100 },
      };
    };

    const started = Date.now();
    const first = await loadHealthIndicators(fetcher as any, { limit: 2, staleWhileRevalidate: true });
    const duplicate = await loadHealthIndicators(fetcher as any, { limit: 2, staleWhileRevalidate: true });

    expect(Date.now() - started).toBeLessThan(50);
    expect(first.meta).toMatchObject({
      delivery: "verified_snapshot",
      freshness: { cacheState: "snapshot", refreshing: true, nextRetryAt: null },
    });
    expect(duplicate.meta).toMatchObject({ freshness: { refreshing: true } });
    expect(calls).toBe(1);

    await sleep(120);
    const refreshed = await loadHealthIndicators(fetcher as any, { limit: 2, staleWhileRevalidate: true });
    expect(refreshed.meta).toMatchObject({
      delivery: "cache",
      freshness: { cacheState: "fresh", refreshing: false, lastLiveSuccessAt: "2026-07-18T08:00:00.000Z" },
    });
    expect(calls).toBe(1);
  });
});
