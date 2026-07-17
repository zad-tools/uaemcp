import { SETTINGS } from "./config.js";
import { fetchResult } from "./connectors.js";
import { AJMAN_BUSINESS_DATASETS, buildAjmanBusinessEvidence } from "./ajman-business.js";
import { citation, REGISTRY } from "./sources.js";

type Fetcher = typeof fetchResult;
export interface AjmanBusinessProduct { data: ReturnType<typeof buildAjmanBusinessEvidence>; meta: Record<string, unknown> }
const cache = new Map<string, { expiresAt: number; value: Promise<AjmanBusinessProduct> }>();

async function load(fetcher: Fetcher, limit: number, query?: string): Promise<AjmanBusinessProduct> {
  const source = REGISTRY.get("ajman_data_portal");
  const results = await Promise.all(AJMAN_BUSINESS_DATASETS.map(async (dataset) => ({ dataset, result: await fetcher(source, { dataset, limit, query }) })));
  const fetchedAt = results.map(({ result }) => result.fetched_at).sort().at(-1) ?? new Date().toISOString();
  const sourceCitation = results[0]?.result.citation ?? citation(source);
  return {
    data: buildAjmanBusinessEvidence(results.map(({ dataset, result }) => ({
      dataset, records: result.records, total: result.total, citation: result.citation, license: result.license,
      fetchedAt: result.fetched_at, dataQuality: result.data_quality as unknown as Record<string, unknown>,
    })), { citation: sourceCitation, fetchedAt, query: query ?? null }),
    meta: { source_id: source.id, citation: sourceCitation, fetched_at: fetchedAt, requested_limit_per_dataset: limit, query: query ?? null, dataset_ids: [...AJMAN_BUSINESS_DATASETS] },
  };
}

export async function loadAjmanBusinessProduct(fetcher: Fetcher = fetchResult, limit = 500, query?: string): Promise<AjmanBusinessProduct> {
  if (fetcher !== fetchResult) return load(fetcher, limit, query);
  const key = `${limit}:${query ?? ""}`;
  const current = cache.get(key);
  if (current && current.expiresAt > Date.now()) return current.value;
  const value = load(fetcher, limit, query).catch((error) => { cache.delete(key); throw error; });
  cache.set(key, { expiresAt: Date.now() + SETTINGS.cacheTtlMs, value });
  return value;
}
