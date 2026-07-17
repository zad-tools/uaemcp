import { SETTINGS } from "./config.js";
import { fetchResult } from "./connectors.js";
import { AJMAN_URBAN_DATASETS, buildAjmanUrbanEvidence } from "./ajman-urban.js";
import { citation, REGISTRY } from "./sources.js";

type Fetcher = typeof fetchResult;
export interface AjmanUrbanProduct { data: ReturnType<typeof buildAjmanUrbanEvidence>; meta: Record<string, unknown> }
const cache = new Map<number, { expiresAt: number; value: Promise<AjmanUrbanProduct> }>();

async function load(fetcher: Fetcher, limit: number): Promise<AjmanUrbanProduct> {
  const source = REGISTRY.get("ajman_data_portal");
  const results = await Promise.all(AJMAN_URBAN_DATASETS.map(async (dataset) => ({ dataset, result: await fetcher(source, { dataset, limit }) })));
  const fetchedAt = results.map(({ result }) => result.fetched_at).sort().at(-1) ?? new Date().toISOString();
  const sourceCitation = results[0]?.result.citation ?? citation(source);
  return {
    data: buildAjmanUrbanEvidence(results.map(({ dataset, result }) => ({ dataset, records: result.records, total: result.total, license: result.license, dataQuality: result.data_quality as unknown as Record<string, unknown> })), { citation: sourceCitation, fetchedAt }),
    meta: { source_id: source.id, citation: sourceCitation, fetched_at: fetchedAt, requested_limit_per_dataset: limit, dataset_ids: [...AJMAN_URBAN_DATASETS] },
  };
}
export async function loadAjmanUrbanProduct(fetcher: Fetcher = fetchResult, limit = 100): Promise<AjmanUrbanProduct> {
  if (fetcher !== fetchResult) return load(fetcher, limit);
  const current = cache.get(limit);
  if (current && current.expiresAt > Date.now()) return current.value;
  const value = load(fetcher, limit).catch((error) => { cache.delete(limit); throw error; });
  cache.set(limit, { expiresAt: Date.now() + SETTINGS.cacheTtlMs, value });
  return value;
}
