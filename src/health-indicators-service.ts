import { fetchResult } from "./connectors.js";
import { buildHealthIndicators, type HealthIndicatorsReport } from "./health-indicators.js";
import { MOHAP_HEALTH_INDICATOR_SNAPSHOT, MOHAP_HEALTH_INDICATOR_SNAPSHOT_META } from "./health-indicators-snapshot.js";
import { REGISTRY } from "./sources.js";
import { SETTINGS } from "./config.js";

type HealthFetcher = typeof fetchResult;
const INITIAL_RETRY_MS = 15 * 60 * 1000;
const MAX_RETRY_MS = 6 * 60 * 60 * 1000;
type HealthFetchResult = Awaited<ReturnType<HealthFetcher>>;
let liveCache: { result: HealthFetchResult; expiresAt: number } | undefined;
let refreshPromise: Promise<void> | undefined;
let failureCount = 0;
let upstreamRetryAt = 0;
let lastLiveSuccessAt: string | null = null;
let lastUpstreamError: string | null = null;

export interface LoadedHealthIndicators {
  report: HealthIndicatorsReport;
  meta: Record<string, unknown>;
}

export interface HealthIndicatorLoadOptions {
  query?: string;
  limit: number;
  offset?: number;
  compact?: boolean;
  staleWhileRevalidate?: boolean;
}

function freshness(cacheState: "fresh" | "stale" | "snapshot" | "backoff", refreshing: boolean) {
  return {
    cacheState,
    refreshing,
    snapshotAgeMs: Math.max(0, Date.now() - Date.parse(MOHAP_HEALTH_INDICATOR_SNAPSHOT_META.retrievedAt)),
    lastLiveSuccessAt,
    nextRetryAt: upstreamRetryAt > Date.now() ? new Date(upstreamRetryAt).toISOString() : null,
    backoffMs: upstreamRetryAt > Date.now() ? upstreamRetryAt - Date.now() : 0,
  };
}

function liveHealthIndicators(result: HealthFetchResult, options: HealthIndicatorLoadOptions, cacheState: "fresh" | "stale", refreshing: boolean): LoadedHealthIndicators {
  const report = buildHealthIndicators(result.records, { citation: result.citation, fetchedAt: result.fetched_at, ...options });
  return {
    report,
    meta: {
      source_id: result.source_id,
      citation: result.citation,
      fetched_at: result.fetched_at,
      returned_records: result.records.length,
      delivery: "cache",
      freshness: freshness(cacheState, refreshing),
      data_quality: result.data_quality,
    },
  };
}

function startBackgroundRefresh(fetcher: HealthFetcher): void {
  if (refreshPromise || Date.now() < upstreamRetryAt) return;
  const source = REGISTRY.get("mohap_health_core_indicators_2024");
  refreshPromise = fetcher(source, { limit: 200 })
    .then((result) => {
      liveCache = { result, expiresAt: Date.now() + SETTINGS.cacheTtlMs };
      lastLiveSuccessAt = result.fetched_at;
      lastUpstreamError = null;
      failureCount = 0;
      upstreamRetryAt = 0;
    })
    .catch((error) => {
      failureCount += 1;
      const backoff = Math.min(MAX_RETRY_MS, INITIAL_RETRY_MS * (2 ** Math.max(0, failureCount - 1)));
      upstreamRetryAt = Date.now() + backoff;
      lastUpstreamError = error instanceof Error ? error.message : String(error);
    })
    .finally(() => { refreshPromise = undefined; });
}

export function _clearHealthIndicatorRuntimeCache(): void {
  liveCache = undefined;
  refreshPromise = undefined;
  failureCount = 0;
  upstreamRetryAt = 0;
  lastLiveSuccessAt = null;
  lastUpstreamError = null;
}

export async function loadHealthIndicators(
  fetcher: HealthFetcher,
  options: HealthIndicatorLoadOptions,
): Promise<LoadedHealthIndicators> {
  const source = REGISTRY.get("mohap_health_core_indicators_2024");
  const useSWR = options.staleWhileRevalidate ?? fetcher === fetchResult;
  if (useSWR) {
    if (liveCache && Date.now() < liveCache.expiresAt) return liveHealthIndicators(liveCache.result, options, "fresh", false);
    if (Date.now() < upstreamRetryAt) {
      if (liveCache) return liveHealthIndicators(liveCache.result, options, "stale", false);
      return snapshotHealthIndicators(source.id, options, lastUpstreamError ?? "MOHAP live source is temporarily in backoff.", "backoff", false);
    }
    startBackgroundRefresh(fetcher);
    if (liveCache) return liveHealthIndicators(liveCache.result, options, "stale", true);
    return snapshotHealthIndicators(source.id, options, lastUpstreamError ?? "Live refresh started in the background.", "snapshot", true);
  }
  try {
    const result = await fetcher(source, { limit: 200 });
    const report = buildHealthIndicators(result.records, {
      citation: result.citation,
      fetchedAt: result.fetched_at,
      ...options,
    });
    return {
      report,
      meta: {
        source_id: source.id,
        citation: result.citation,
        fetched_at: result.fetched_at,
        returned_records: result.records.length,
        delivery: "live",
        freshness: { ...freshness("fresh", false), lastLiveSuccessAt: result.fetched_at },
        data_quality: result.data_quality,
      },
    };
  } catch (error) {
    return snapshotHealthIndicators(source.id, options, error instanceof Error ? error.message : String(error), "snapshot", false);
  }
}

function snapshotHealthIndicators(sourceId: string, options: HealthIndicatorLoadOptions, upstreamError: string, cacheState: "snapshot" | "backoff", refreshing: boolean): LoadedHealthIndicators {
  const records = MOHAP_HEALTH_INDICATOR_SNAPSHOT as unknown as ReadonlyArray<Readonly<Record<string, unknown>>>;
  const report = buildHealthIndicators(records, {
    citation: MOHAP_HEALTH_INDICATOR_SNAPSHOT_META.source,
    fetchedAt: MOHAP_HEALTH_INDICATOR_SNAPSHOT_META.retrievedAt,
    ...options,
  });
  report.source.delivery = "verified_snapshot";
  report.source.sha256 = MOHAP_HEALTH_INDICATOR_SNAPSHOT_META.sha256;
  report.limitations.push("The live MOHAP workbook was unavailable for this request; the response uses the retained verified snapshot identified by source SHA-256.");
  return {
    report,
    meta: {
      source_id: sourceId,
      citation: MOHAP_HEALTH_INDICATOR_SNAPSHOT_META.source,
      fetched_at: MOHAP_HEALTH_INDICATOR_SNAPSHOT_META.retrievedAt,
      returned_records: records.length,
      delivery: "verified_snapshot",
      sha256: MOHAP_HEALTH_INDICATOR_SNAPSHOT_META.sha256,
      upstream_error: upstreamError,
      retry_after: upstreamRetryAt > Date.now() ? new Date(upstreamRetryAt).toISOString() : null,
      freshness: freshness(cacheState, refreshing),
      data_quality: { confidence: "medium", warnings: ["Live upstream unavailable; served verified retained snapshot."], validation: { snapshot_sha256: MOHAP_HEALTH_INDICATOR_SNAPSHOT_META.sha256 } },
    },
  };
}
