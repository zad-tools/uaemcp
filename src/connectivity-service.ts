import { fetchResult, type FetchResult } from "./connectors.js";
import { buildConnectivityPulse, type ConnectivityInput, type ConnectivityOptions, type ConnectivitySeriesId } from "./connectivity.js";
import { TDRA_CONNECTIVITY_SNAPSHOT, TDRA_CONNECTIVITY_SNAPSHOT_META } from "./connectivity-snapshot.js";
import { REGISTRY, type Source } from "./sources.js";

type Fetcher = (source: Source, options: { limit?: number }) => Promise<FetchResult>;
const SOURCES = {
  active_mobile_subscriptions: "tdra_active_mobile_subscriptions_2025",
  broadband_per_100_inhabitants: "tdra_broadband_per_100_2025",
  fixed_lines_per_100_inhabitants: "tdra_fixed_lines_per_100_2025",
} as const satisfies Record<ConnectivitySeriesId, string>;

const RETRY_MS = 15 * 60 * 1000;
let retryAt = 0;

export async function loadConnectivityPulse(fetcher: Fetcher = fetchResult, options: ConnectivityOptions = {}) {
  if (fetcher === fetchResult && Date.now() < retryAt) return snapshot(options, "TDRA workbook fetch is temporarily in backoff after an upstream failure.");
  try {
    const entries = Object.entries(SOURCES) as [ConnectivitySeriesId, string][];
    const results = await Promise.all(entries.map(async ([series, sourceId]) => [series, await fetcher(REGISTRY.get(sourceId), { limit: 500 })] as const));
    const bySeries = Object.fromEntries(results) as Record<ConnectivitySeriesId, FetchResult>;
    const input = Object.fromEntries(results.map(([series, result]) => [series, result.records])) as unknown as ConnectivityInput;
    const fetchedAt = results.map(([, result]) => result.fetched_at).sort().at(-1) ?? new Date().toISOString();
    const data = buildConnectivityPulse(input, {
      ...options,
      fetchedAt,
      provenance: Object.fromEntries(results.map(([series, result]) => [series, { sourceId: result.source_id, citation: result.citation }])),
    });
    return {
      data,
      meta: {
        source_ids: Object.values(SOURCES),
        citations: Object.fromEntries(results.map(([series, result]) => [series, result.citation])),
        fetched_at: fetchedAt,
        delivery: "live",
        partial: false,
        returned_records: Object.fromEntries(results.map(([series, result]) => [series, result.records.length])),
        data_quality: Object.fromEntries(results.map(([series, result]) => [series, result.data_quality])),
      },
    } as const;
  } catch (error) {
    if (fetcher === fetchResult) retryAt = Date.now() + RETRY_MS;
    return snapshot(options, error instanceof Error ? error.message : String(error));
  }
}

function snapshot(options: ConnectivityOptions, upstreamError: string) {
  const provenance = Object.fromEntries((Object.entries(SOURCES) as [ConnectivitySeriesId, string][]).map(([series, sourceId]) => {
    const source = REGISTRY.get(sourceId);
    return [series, { sourceId, citation: source.docs_url }];
  }));
  const report = buildConnectivityPulse(TDRA_CONNECTIVITY_SNAPSHOT as unknown as ConnectivityInput, {
    ...options,
    fetchedAt: TDRA_CONNECTIVITY_SNAPSHOT_META.retrievedAt,
    provenance,
  });
  return {
    data: {
      ...report,
      limitations: [
        ...report.limitations,
        "The live TDRA workbooks were unavailable for this request; the response uses retained verified year-end observations, not the complete monthly series.",
      ],
    },
    meta: {
      source_ids: Object.values(SOURCES),
      citations: Object.fromEntries((Object.entries(SOURCES) as [ConnectivitySeriesId, string][]).map(([series, sourceId]) => [series, REGISTRY.get(sourceId).docs_url])),
      fetched_at: TDRA_CONNECTIVITY_SNAPSHOT_META.retrievedAt,
      delivery: "verified_snapshot",
      partial: true,
      upstream_error: upstreamError,
      sha256: TDRA_CONNECTIVITY_SNAPSHOT_META.sha256,
      snapshot_granularity: TDRA_CONNECTIVITY_SNAPSHOT_META.granularity,
      returned_records: Object.fromEntries((Object.entries(TDRA_CONNECTIVITY_SNAPSHOT) as [ConnectivitySeriesId, readonly unknown[]][]).map(([series, records]) => [series, records.length])),
    },
  } as const;
}

export type { ConnectivityOptions, ConnectivitySeriesId } from "./connectivity.js";
export { CONNECTIVITY_SERIES_IDS } from "./connectivity.js";
