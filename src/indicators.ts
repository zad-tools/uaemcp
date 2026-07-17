import { coverageSummary } from "./catalog.js";
import { emirateFromRecord } from "./geography.js";
import type { ReliabilityStore } from "./reliability.js";
import type { Source } from "./sources.js";
import { REGISTRY } from "./sources.js";

type Rec = Record<string, unknown>;

export const INDICATOR_IDS = ["open_data_coverage", "api_health_score", "dataset_stability", "industrial_distribution"] as const;
export type IndicatorId = typeof INDICATOR_IDS[number];

export function listIndicators(): Rec[] {
  return [
    { id: "open_data_coverage", unit: "percent", sourceRequired: false, description: "Share of indexed official portals with a verified live record connector." },
    { id: "api_health_score", unit: "percent", sourceRequired: false, description: "Observed successful checks across retained source-health history." },
    { id: "dataset_stability", unit: "score_0_to_100", sourceRequired: true, description: "Stability of retained snapshot record counts for one source and dataset." },
    { id: "industrial_distribution", unit: "record_count", sourceRequired: true, description: "Bounded industrial records grouped by normalized UAE emirate." },
  ];
}

function result(id: IndicatorId, value: unknown, dimensions: unknown, methodology: Rec, evidence: unknown[], limitations: string[], citations: string[]): Rec {
  return { indicator: id, value, dimensions, methodology, evidence, limitations, citations, generatedAt: new Date().toISOString() };
}

export function coverageIndicator(): Rec {
  const coverage = coverageSummary() as Rec;
  const indexed = Number(coverage.officialPortalsIndexed); const live = Number(coverage.liveRecordConnectors);
  const value = indexed ? Number(((live / indexed) * 100).toFixed(2)) : 0;
  return result("open_data_coverage", value, { live, indexed }, { formula: "live_record_connectors / official_portals_indexed * 100" }, [coverage], ["A metadata-only or key-gated portal is not counted as live."], REGISTRY.list().filter((source) => source.access_status === "live").map((source) => source.docs_url || source.base_url));
}

export function healthIndicator(store: ReliabilityStore, sources = REGISTRY.list()): Rec {
  const histories = sources.map((source) => ({ source, history: store.healthHistory(source.id, 100) })).filter(({ history }) => Number((history.summary as Rec).samples) > 0);
  const samples = histories.reduce((sum, item) => sum + Number((item.history.summary as Rec).samples), 0);
  const successes = histories.reduce((sum, item) => sum + Number((item.history.summary as Rec).uptimeRatio) * Number((item.history.summary as Rec).samples), 0);
  const value = samples ? Number(((successes / samples) * 100).toFixed(2)) : null;
  return result("api_health_score", value, { sourcesObserved: histories.length, samples }, { formula: "successful_checks / retained_checks * 100", window: "up to 100 checks per source" }, histories.map(({ source, history }) => ({ sourceId: source.id, summary: history.summary })), ["Null means no health observations have been stored yet.", "This measures API reachability, not correctness of published data."], histories.map(({ source }) => source.docs_url || source.base_url));
}

export function stabilityIndicator(source: Source, snapshots: Rec[]): Rec {
  const counts = snapshots.map((snapshot) => Number(snapshot.recordCount ?? snapshot.record_count)).filter(Number.isFinite);
  let value: number | null = null;
  if (counts.length >= 2) {
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + (count - mean) ** 2, 0) / counts.length;
    const coefficient = mean ? Math.sqrt(variance) / Math.abs(mean) : 0;
    value = Number((Math.max(0, 1 - Math.min(1, coefficient)) * 100).toFixed(2));
  }
  return result("dataset_stability", value, { snapshots: counts.length, recordCounts: counts }, { formula: "100 * (1 - bounded_coefficient_of_variation)" }, snapshots, ["At least two changed snapshots are required.", "Stable record counts do not prove stable schema or record identity."], [source.docs_url || source.base_url]);
}

export function industrialDistributionIndicator(source: Source, records: Rec[]): Rec {
  const counts = new Map<string, { id: string; en: string; ar: string; count: number }>(); let unmatched = 0;
  for (const record of records) {
    const emirate = emirateFromRecord(record); if (!emirate) { unmatched += 1; continue; }
    const current = counts.get(emirate.id) ?? { id: emirate.id, en: emirate.en, ar: emirate.ar, count: 0 };
    counts.set(emirate.id, { ...current, count: current.count + 1 });
  }
  const dimensions = [...counts.values()].sort((left, right) => right.count - left.count);
  return result("industrial_distribution", records.length - unmatched, dimensions, { formula: "count bounded records after canonical emirate normalization", sampleSize: records.length }, records.slice(0, 20), ["This is a bounded API sample unless the upstream result set fits within the requested limit.", `${unmatched} record(s) lacked a recognized emirate.`], [source.docs_url || source.base_url]);
}
