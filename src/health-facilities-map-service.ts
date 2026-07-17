import { fetchResult, type FetchResult } from "./connectors.js";
import { buildHealthFacilitiesMap, type HealthFacilitiesMapOptions } from "./health-facilities-map.js";
import { MOHAP_HEALTH_FACILITIES_MAP_SNAPSHOT, MOHAP_HEALTH_FACILITIES_MAP_SNAPSHOT_META } from "./health-facilities-map-snapshot.js";
import { REGISTRY, type Source } from "./sources.js";

type Fetcher = (source: Source, options: { limit?: number }) => Promise<FetchResult>;
const SOURCE_ID = "mohap_health_facilities_gis_2026";
const RETRY_MS = 15 * 60 * 1000;
const CACHE_TTL_MS = 15 * 60 * 1000;
let retryAt = 0;
let liveCache: Readonly<{ expiresAt: number; result: FetchResult }> | null = null;

export async function loadHealthFacilitiesMap(fetcher: Fetcher = fetchResult, options: HealthFacilitiesMapOptions = {}) {
  const source = REGISTRY.get(SOURCE_ID);
  if (fetcher === fetchResult) return snapshot(options);
  if (fetcher === fetchResult && Date.now() < retryAt) return snapshot(options, "MOHAP GIS workbook fetch is temporarily in backoff after an upstream failure.");
  try {
    const cached = fetcher === fetchResult && liveCache && Date.now() < liveCache.expiresAt ? liveCache.result : null;
    const result = cached ?? await fetcher(source, { limit: 16000 });
    if (!cached && fetcher === fetchResult) liveCache = { expiresAt: Date.now() + CACHE_TTL_MS, result: structuredClone(result) };
    const data = buildHealthFacilitiesMap(result.records, { ...options, citation: result.citation, fetchedAt: result.fetched_at });
    return { data, meta: { source_id: source.id, citation: result.citation, fetched_at: result.fetched_at, delivery: "live", partial: false, source_rows: result.total ?? result.records.length, returned_records: result.records.length, data_quality: structuredClone(result.data_quality) } } as const;
  } catch (error) {
    if (fetcher === fetchResult) retryAt = Date.now() + RETRY_MS;
    return snapshot(options, error instanceof Error ? error.message : String(error));
  }
}

function snapshot(options: HealthFacilitiesMapOptions, upstreamError?: string) {
  const report = buildHealthFacilitiesMap(MOHAP_HEALTH_FACILITIES_MAP_SNAPSHOT, { ...options, citation: MOHAP_HEALTH_FACILITIES_MAP_SNAPSHOT_META.source, fetchedAt: MOHAP_HEALTH_FACILITIES_MAP_SNAPSHOT_META.retrievedAt });
  const complete = MOHAP_HEALTH_FACILITIES_MAP_SNAPSHOT_META.retainedRows === MOHAP_HEALTH_FACILITIES_MAP_SNAPSHOT_META.sourceRows;
  return {
    data: { ...report, limitations: [...report.limitations, complete ? "This response uses a release-pinned, SHA-256 verified copy of all 15,326 published workbook rows." : "This response uses a retained subset and is not representative of all published rows."] },
    meta: { source_id: SOURCE_ID, citation: MOHAP_HEALTH_FACILITIES_MAP_SNAPSHOT_META.source, fetched_at: MOHAP_HEALTH_FACILITIES_MAP_SNAPSHOT_META.retrievedAt, delivery: "verified_snapshot", partial: !complete, ...(upstreamError ? { upstream_error: upstreamError } : {}), sha256: MOHAP_HEALTH_FACILITIES_MAP_SNAPSHOT_META.sha256, source_rows: MOHAP_HEALTH_FACILITIES_MAP_SNAPSHOT_META.sourceRows, returned_records: MOHAP_HEALTH_FACILITIES_MAP_SNAPSHOT_META.retainedRows },
  } as const;
}

export type { HealthFacilitiesMapOptions } from "./health-facilities-map.js";
