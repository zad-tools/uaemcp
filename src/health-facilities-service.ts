import { fetchResult } from "./connectors.js";
import { buildHealthFacilitiesAtlas, type HealthFacilitiesOptions } from "./health-facilities.js";
import { MOHAP_HEALTH_FACILITIES_SNAPSHOT, MOHAP_HEALTH_FACILITIES_SNAPSHOT_META } from "./health-facilities-snapshot.js";
import { REGISTRY } from "./sources.js";

type Fetcher = typeof fetchResult;
type Filters = Omit<HealthFacilitiesOptions, "citation" | "fetchedAt">;
const RETRY_MS = 15 * 60 * 1000;
let retryAt = 0;

export async function loadHealthFacilitiesAtlas(fetcher: Fetcher, filters: Filters = {}) {
  const source = REGISTRY.get("mohap_health_facilities_2024");
  if (fetcher === fetchResult && Date.now() < retryAt) return snapshot(filters, "MOHAP workbook fetch is temporarily in backoff after an upstream failure.");
  try {
    const result = await fetcher(source, { limit: 1000 });
    const data = buildHealthFacilitiesAtlas(result.records, { citation: result.citation, fetchedAt: result.fetched_at, ...filters });
    return { data, meta: { source_id: source.id, citation: result.citation, fetched_at: result.fetched_at, delivery: "live", partial: false, returned_records: result.records.length, data_quality: result.data_quality } };
  } catch (error) {
    if (fetcher === fetchResult) retryAt = Date.now() + RETRY_MS;
    return snapshot(filters, error instanceof Error ? error.message : String(error));
  }
}

function snapshot(filters: Filters, upstreamError: string) {
  const records = MOHAP_HEALTH_FACILITIES_SNAPSHOT as unknown as ReadonlyArray<Readonly<Record<string, unknown>>>;
  const report = buildHealthFacilitiesAtlas(records, { citation: MOHAP_HEALTH_FACILITIES_SNAPSHOT_META.source, fetchedAt: MOHAP_HEALTH_FACILITIES_SNAPSHOT_META.retrievedAt, ...filters });
  const data = { ...report, limitations: [...report.limitations, "The live MOHAP workbook was unavailable for this request; the response uses a retained verified snapshot identified by source SHA-256."] };
  return { data, meta: { source_id: "mohap_health_facilities_2024", citation: MOHAP_HEALTH_FACILITIES_SNAPSHOT_META.source, fetched_at: MOHAP_HEALTH_FACILITIES_SNAPSHOT_META.retrievedAt, delivery: "verified_snapshot", partial: true, upstream_error: upstreamError, sha256: MOHAP_HEALTH_FACILITIES_SNAPSHOT_META.sha256, returned_records: records.length } };
}
