import { SETTINGS } from "./config.js";
import { AJMAN_PARKS_SNAPSHOT } from "./ajman-parks-snapshot.js";
import { buildAjmanParksEvidence } from "./ajman-parks.js";
import { fetchResult } from "./connectors.js";
import { REGISTRY } from "./sources.js";

type Fetcher = typeof fetchResult;
const DATASET = "parks-visitors-in-ajman";
const cache = new Map<string, { expiresAt: number; value: Promise<Awaited<ReturnType<typeof load>>> }>();

function snapshotProduct(error: unknown) {
  const data = {
    kind: "ajman_parks_footfall", generatedAt: new Date().toISOString(), fetchedAt: AJMAN_PARKS_SNAPSHOT.sourceDataProcessedAt,
    delivery: "verified_snapshot", geography: { emirate: "Ajman", emirateAr: "عجمان", country: "United Arab Emirates" },
    summary: { publishedVisitObservations: AJMAN_PARKS_SNAPSHOT.publishedVisitObservations, validRows: AJMAN_PARKS_SNAPSHOT.validRows, excludedRows: AJMAN_PARKS_SNAPSHOT.excludedRows, years: AJMAN_PARKS_SNAPSHOT.annual.length, parks: AJMAN_PARKS_SNAPSHOT.parks.length },
    annual: [...AJMAN_PARKS_SNAPSHOT.annual], parks: [...AJMAN_PARKS_SNAPSHOT.parks],
    scope: { dataset: DATASET, upstreamRecords: AJMAN_PARKS_SNAPSHOT.sourceRows, returnedRecords: AJMAN_PARKS_SNAPSHOT.sourceRows, completePopulation: true, period: { from: 2017, to: 2023 }, unit: "source-published park visits" },
    methodology: { operation: "sum valid source-published monthly visit observations by year and source-native park label", deduplication: false, uniquePeople: false, crossDatasetAggregation: false },
    evidence: { sourceId: "ajman_data_portal", datasetId: DATASET, publisher: "Municipality & Planning Department", license: "CC BY 4.0", citation: "https://data.ajman.ae/explore/dataset/parks-visitors-in-ajman/", snapshotSha256: AJMAN_PARKS_SNAPSHOT.sha256, verifiedAt: AJMAN_PARKS_SNAPSHOT.verifiedAt },
    limitations: ["Published visit observations are not unique people; repeat visits may be counted more than once.", "The fallback contains verified aggregates, not raw personal or row-level data.", "The dataset does not measure satisfaction, demand, park quality, capacity, resident population or tourism performance.", "Park labels remain source-native; similar labels are not merged without an explicit semantic mapping."],
    citations: ["https://data.ajman.ae/explore/dataset/parks-visitors-in-ajman/"],
  } as const;
  return { data, meta: { source_id: "ajman_data_portal", dataset_id: DATASET, fallback: true, live_error: error instanceof Error ? error.message : String(error), snapshot_sha256: AJMAN_PARKS_SNAPSHOT.sha256, upstream_records: AJMAN_PARKS_SNAPSHOT.sourceRows, returned_records: AJMAN_PARKS_SNAPSHOT.sourceRows } };
}

async function load(fetcher: Fetcher) {
  const source = REGISTRY.get("ajman_data_portal");
  try {
    const first = await fetcher(source, { dataset: DATASET, limit: 100, offset: 0 });
    const pageSize = first.records.length;
    if (first.total !== null && first.total > 0 && pageSize === 0) throw new Error("official dataset reported rows but returned an empty first page");
    const offsets = first.total !== null && pageSize > 0
      ? Array.from({ length: Math.min(20, Math.ceil(first.total / pageSize)) - 1 }, (_, index) => (index + 1) * pageSize)
      : [];
    const pages = await Promise.all(offsets.map((offset) => fetcher(source, { dataset: DATASET, limit: pageSize, offset })));
    const records = [first, ...pages].flatMap((page) => page.records);
    const fetchedAt = [...pages.map((page) => page.fetched_at), first.fetched_at].sort().at(-1) ?? first.fetched_at;
    return { data: buildAjmanParksEvidence(records, { fetchedAt, delivery: "live", upstreamRecords: first.total }), meta: { source_id: source.id, dataset_id: DATASET, fallback: false, upstream_records: first.total, returned_records: records.length, citation: first.citation, fetched_at: fetchedAt } };
  } catch (error) { return snapshotProduct(error); }
}

export async function loadAjmanParksProduct(fetcher: Fetcher = fetchResult) {
  if (fetcher !== fetchResult) return load(fetcher);
  const current = cache.get(DATASET);
  if (current && current.expiresAt > Date.now()) return current.value;
  const value = load(fetcher).catch((error) => { cache.delete(DATASET); throw error; });
  cache.set(DATASET, { expiresAt: Date.now() + SETTINGS.cacheTtlMs, value });
  return value;
}
