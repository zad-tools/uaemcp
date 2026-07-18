import { fetchResult } from "./connectors.js";
import { buildHealthIndicators, type HealthIndicatorsReport } from "./health-indicators.js";
import { MOHAP_HEALTH_INDICATOR_SNAPSHOT, MOHAP_HEALTH_INDICATOR_SNAPSHOT_META } from "./health-indicators-snapshot.js";
import { REGISTRY } from "./sources.js";

type HealthFetcher = typeof fetchResult;
const UPSTREAM_RETRY_MS = 15 * 60 * 1000;
let upstreamRetryAt = 0;

export interface LoadedHealthIndicators {
  report: HealthIndicatorsReport;
  meta: Record<string, unknown>;
}

export interface HealthIndicatorLoadOptions {
  query?: string;
  limit: number;
  offset?: number;
  compact?: boolean;
}

export async function loadHealthIndicators(
  fetcher: HealthFetcher,
  options: HealthIndicatorLoadOptions,
): Promise<LoadedHealthIndicators> {
  const source = REGISTRY.get("mohap_health_core_indicators_2024");
  if (fetcher === fetchResult && Date.now() < upstreamRetryAt) {
    return snapshotHealthIndicators(source.id, options, "MOHAP cloud-host connection is temporarily in backoff after a failed live fetch.");
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
        data_quality: result.data_quality,
      },
    };
  } catch (error) {
    if (fetcher === fetchResult) upstreamRetryAt = Date.now() + UPSTREAM_RETRY_MS;
    return snapshotHealthIndicators(source.id, options, error instanceof Error ? error.message : String(error));
  }
}

function snapshotHealthIndicators(sourceId: string, options: HealthIndicatorLoadOptions, upstreamError: string): LoadedHealthIndicators {
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
      retry_after: new Date(upstreamRetryAt).toISOString(),
      data_quality: { confidence: "medium", warnings: ["Live upstream unavailable; served verified retained snapshot."], validation: { snapshot_sha256: MOHAP_HEALTH_INDICATOR_SNAPSHOT_META.sha256 } },
    },
  };
}
