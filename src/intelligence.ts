import { coverageSummary, datasetModel } from "./catalog.js";
import type { DatasetRef } from "./connectors.js";
import { ValidationError } from "./errors.js";
import { emirateFromRecord } from "./geography.js";
import type { ReliabilityStore } from "./reliability.js";
import type { Source } from "./sources.js";
import { REGISTRY } from "./sources.js";

type Rec = Record<string, unknown>;

export const RECIPE_IDS = ["source_coverage", "dataset_freshness", "historical_comparison", "emirate_comparison", "trend_analysis"] as const;
export type RecipeId = (typeof RECIPE_IDS)[number];

export interface RecipeInput {
  recipe: RecipeId;
  sourceId?: string;
  dataset?: string;
  datasets?: DatasetRef[];
  fromSnapshot?: number;
  toSnapshot?: number;
  now?: number;
  records?: Rec[];
  snapshots?: Rec[];
}

const recipeCatalog = [
  { id: "source_coverage", title: "UAE open-data coverage", needsNetwork: false, description: "Honest breakdown of indexed, live, gated and metadata-only official portals." },
  { id: "dataset_freshness", title: "Dataset freshness", needsNetwork: true, description: "Classify a portal's discoverable datasets by age and expose missing timestamps." },
  { id: "historical_comparison", title: "Historical comparison", needsNetwork: false, description: "Explain record and schema changes between two stored snapshots." },
  { id: "emirate_comparison", title: "Emirate comparison", needsNetwork: true, description: "Normalize bilingual emirate names and compare record coverage with cited methodology." },
  { id: "trend_analysis", title: "Snapshot trend analysis", needsNetwork: false, description: "Measure direction and change across retained dataset snapshot counts." },
] satisfies Rec[];

export function listRecipes(): Rec[] {
  return recipeCatalog.map((recipe) => ({ ...recipe }));
}

export function runRecipe(input: RecipeInput, store: ReliabilityStore): Rec {
  if (input.recipe === "source_coverage") return coverageRecipe(REGISTRY.list());
  if (input.recipe === "dataset_freshness") {
    if (!input.sourceId) throw new ValidationError("source_id is required");
    if (!input.datasets) throw new ValidationError("datasets must be discovered before running dataset_freshness");
    return freshnessRecipe(REGISTRY.get(input.sourceId), input.datasets, input.now);
  }
  if (input.recipe === "emirate_comparison") {
    if (!input.sourceId || !input.records) throw new ValidationError("source_id and fetched records are required");
    return emirateComparisonRecipe(REGISTRY.get(input.sourceId), input.records);
  }
  if (input.recipe === "trend_analysis") {
    if (!input.sourceId || !input.snapshots) throw new ValidationError("source_id and snapshots are required");
    return trendRecipe(REGISTRY.get(input.sourceId), input.snapshots);
  }
  if (!input.fromSnapshot || !input.toSnapshot) throw new ValidationError("from_snapshot and to_snapshot are required");
  return historicalRecipe(store.diffSnapshots(input.fromSnapshot, input.toSnapshot));
}

export function emirateComparisonRecipe(source: Source, records: Rec[]): Rec {
  const counts = new Map<string, { emirateId: string; emirateEn: string; emirateAr: string; value: number }>();
  let unmatched = 0;
  for (const record of records) {
    const emirate = emirateFromRecord(record);
    if (!emirate) { unmatched += 1; continue; }
    const current = counts.get(emirate.id) ?? { emirateId: emirate.id, emirateEn: emirate.en, emirateAr: emirate.ar, value: 0 };
    counts.set(emirate.id, { ...current, value: current.value + 1 });
  }
  const emirates = [...counts.values()].sort((left, right) => right.value - left.value || left.emirateId.localeCompare(right.emirateId));
  return {
    recipe: "emirate_comparison",
    answer: { sourceId: source.id, matchedRecords: records.length - unmatched, unmatchedRecords: unmatched, emirates },
    methodology: { indicator: "record_count_by_emirate", operation: "normalize_uae_emirate_aliases_then_count", sampleSize: records.length },
    lineage: [{ origin: source.id, connector: source.kind, operation: "fetch" }, { operation: "normalize_emirate", version: "uae-geography-v1" }, { operation: "aggregate_count", timestamp: new Date().toISOString() }],
    evidence: records.slice(0, 20),
    limitations: ["Counts describe the bounded records fetched for this run, not necessarily the full population.", "Unrecognized or missing emirate values are reported separately."],
    citations: [source.docs_url || source.base_url],
  };
}

export function trendRecipe(source: Source, snapshots: Rec[]): Rec {
  const points = snapshots.map((snapshot) => ({ capturedAt: String(snapshot.capturedAt ?? snapshot.captured_at ?? ""), recordCount: Number(snapshot.recordCount ?? snapshot.record_count) }))
    .filter((point) => point.capturedAt && Number.isFinite(point.recordCount)).sort((left, right) => Date.parse(left.capturedAt) - Date.parse(right.capturedAt));
  if (points.length < 2) throw new ValidationError("trend_analysis requires at least two snapshots");
  const first = points[0].recordCount; const last = points.at(-1)!.recordCount;
  const absoluteChange = last - first;
  const percentChange = first === 0 ? null : Number(((absoluteChange / first) * 100).toFixed(3));
  const direction = absoluteChange > 0 ? "up" : absoluteChange < 0 ? "down" : "unchanged";
  return {
    recipe: "trend_analysis",
    answer: { sourceId: source.id, direction, absoluteChange, percentChange, points },
    methodology: { indicator: "snapshot_record_count", operation: "compare_first_and_last_retained_snapshot", observations: points.length },
    lineage: [{ origin: source.id, operation: "load_snapshots" }, { operation: "sort_by_capture_time" }, { operation: "calculate_change", timestamp: new Date().toISOString() }],
    evidence: points,
    limitations: ["A record-count trend can reflect source coverage or pagination changes and does not establish real-world growth or causality."],
    citations: [source.docs_url || source.base_url],
  };
}

export function coverageRecipe(sources: Source[]): Rec {
  const coverage = coverageSummary();
  const live = sources.filter((source) => source.access_status === "live");
  return {
    recipe: "source_coverage",
    answer: coverage,
    methodology: { operation: "classify_registered_portals", statusField: "access_status", generatedFrom: "built-in registry" },
    lineage: [{ origin: "built-in registry", operation: "classify_access_status", timestamp: new Date().toISOString() }],
    evidence: live.map((source) => ({ sourceId: source.id, accessStatus: source.access_status, connector: source.kind, url: source.base_url })),
    limitations: ["Coverage measures registered portals and known queryable datasets, not every dataset published in the UAE.", "License status remains unverified until confirmed per dataset."],
    citations: live.map((source) => source.base_url),
  };
}

export function freshnessRecipe(source: Source, datasets: DatasetRef[], now = Date.now()): Rec {
  const modeled = datasets.map((dataset) => datasetModel(dataset, source, now));
  const counts = { current: 0, stale: 0, unknown: 0 };
  for (const item of modeled) {
    const status = (item.freshness as Rec).status as keyof typeof counts;
    counts[status] += 1;
  }
  return {
    recipe: "dataset_freshness",
    answer: { sourceId: source.id, total: modeled.length, ...counts, datasets: modeled },
    methodology: { currentThresholdDays: 365, operation: "compare_dataset_modified_at_to_current_time" },
    lineage: [{ origin: source.id, connector: source.kind, operation: "discover_datasets" }, { operation: "classify_freshness", timestamp: new Date(now).toISOString() }],
    evidence: [{ sourceId: source.id, connector: source.kind, portal: source.base_url, datasetsInspected: modeled.length }],
    limitations: ["A missing or invalid modified timestamp is classified as unknown.", "Portal timestamps may describe metadata edits rather than record-level freshness."],
    citations: [source.docs_url || source.base_url],
  };
}

export function historicalRecipe(diff: Rec): Rec {
  const records = diff.recordDiff as Rec;
  const schema = diff.schemaDiff as Rec;
  return {
    recipe: "historical_comparison",
    answer: {
      changed: diff.changed,
      recordsAdded: records.added,
      recordsRemoved: records.removed,
      schemaFieldsAdded: schema.addedFields,
      schemaFieldsRemoved: schema.removedFields,
      schemaFieldsChanged: schema.changedFields,
    },
    methodology: { operation: "canonical_record_set_and_inferred_schema_diff", fromSnapshot: diff.fromSnapshot, toSnapshot: diff.toSnapshot },
    lineage: [{ origin: [diff.fromSnapshot, diff.toSnapshot], operation: "load_snapshots" }, { operation: "canonical_record_and_schema_diff", timestamp: new Date().toISOString() }],
    evidence: [diff],
    limitations: ["Records are compared as canonical JSON values; no domain-specific entity key is assumed.", "Only the records captured in each bounded snapshot are compared."],
    citations: [],
  };
}
