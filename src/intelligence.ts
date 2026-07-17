import { coverageSummary, datasetModel } from "./catalog.js";
import type { DatasetRef } from "./connectors.js";
import { ValidationError } from "./errors.js";
import type { ReliabilityStore } from "./reliability.js";
import type { Source } from "./sources.js";
import { REGISTRY } from "./sources.js";

type Rec = Record<string, unknown>;

export const RECIPE_IDS = ["source_coverage", "dataset_freshness", "historical_comparison"] as const;
export type RecipeId = (typeof RECIPE_IDS)[number];

export interface RecipeInput {
  recipe: RecipeId;
  sourceId?: string;
  dataset?: string;
  datasets?: DatasetRef[];
  fromSnapshot?: number;
  toSnapshot?: number;
  now?: number;
}

const recipeCatalog = [
  { id: "source_coverage", title: "UAE open-data coverage", needsNetwork: false, description: "Honest breakdown of indexed, live, gated and metadata-only official portals." },
  { id: "dataset_freshness", title: "Dataset freshness", needsNetwork: true, description: "Classify a portal's discoverable datasets by age and expose missing timestamps." },
  { id: "historical_comparison", title: "Historical comparison", needsNetwork: false, description: "Explain record and schema changes between two stored snapshots." },
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
  if (!input.fromSnapshot || !input.toSnapshot) throw new ValidationError("from_snapshot and to_snapshot are required");
  return historicalRecipe(store.diffSnapshots(input.fromSnapshot, input.toSnapshot));
}

export function coverageRecipe(sources: Source[]): Rec {
  const coverage = coverageSummary();
  const live = sources.filter((source) => source.access_status === "live");
  return {
    recipe: "source_coverage",
    answer: coverage,
    methodology: { operation: "classify_registered_portals", statusField: "access_status", generatedFrom: "built-in registry" },
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
    evidence: [diff],
    limitations: ["Records are compared as canonical JSON values; no domain-specific entity key is assumed.", "Only the records captured in each bounded snapshot are compared."],
    citations: [],
  };
}
