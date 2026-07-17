import { fetchResult } from "./connectors.js";
import { buildHealthIndicators, type HealthIndicatorsReport } from "./health-indicators.js";
import { MOHAP_HEALTH_INDICATOR_SNAPSHOT, MOHAP_HEALTH_INDICATOR_SNAPSHOT_META } from "./health-indicators-snapshot.js";
import { REGISTRY } from "./sources.js";

type HealthFetcher = typeof fetchResult;

export interface LoadedHealthIndicators {
  report: HealthIndicatorsReport;
  meta: Record<string, unknown>;
}

export async function loadHealthIndicators(
  fetcher: HealthFetcher,
  options: { query?: string; limit: number },
): Promise<LoadedHealthIndicators> {
  const source = REGISTRY.get("mohap_health_core_indicators_2024");
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
        source_id: source.id,
        citation: MOHAP_HEALTH_INDICATOR_SNAPSHOT_META.source,
        fetched_at: MOHAP_HEALTH_INDICATOR_SNAPSHOT_META.retrievedAt,
        returned_records: records.length,
        delivery: "verified_snapshot",
        sha256: MOHAP_HEALTH_INDICATOR_SNAPSHOT_META.sha256,
        upstream_error: error instanceof Error ? error.message : String(error),
        data_quality: { confidence: "medium", warnings: ["Live upstream unavailable; served verified retained snapshot."], validation: { snapshot_sha256: MOHAP_HEALTH_INDICATOR_SNAPSHOT_META.sha256 } },
      },
    };
  }
}
