import { SETTINGS } from "./config.js";
import { fetchResult } from "./connectors.js";
import { citation, REGISTRY } from "./sources.js";
import { buildTradeFlowRadar, TRADE_DATASETS } from "./trade-flow.js";

type TradeFetcher = typeof fetchResult;

export interface TradeFlowProduct {
  data: ReturnType<typeof buildTradeFlowRadar>;
  meta: Record<string, unknown>;
}

const cache = new Map<number, { expiresAt: number; value: Promise<TradeFlowProduct> }>();

async function load(fetcher: TradeFetcher, limit: number): Promise<TradeFlowProduct> {
  const source = REGISTRY.get("ajman_data_portal");
  const results = await Promise.all(TRADE_DATASETS.map(async ([dataset, flow]) => ({
    dataset,
    flow,
    result: await fetcher(source, { dataset, limit }),
  })));
  const fetchedAt = results.map(({ result }) => result.fetched_at).sort().at(-1) ?? new Date().toISOString();
  const sourceCitation = results[0]?.result.citation ?? citation(source);
  return {
    data: buildTradeFlowRadar(results.map(({ dataset, flow, result }) => ({
      dataset, flow, records: result.records, upstreamTotal: result.total,
      citation: result.citation, license: result.license, dataQuality: result.data_quality as unknown as Record<string, unknown>, fetchedAt: result.fetched_at,
    })), { citation: sourceCitation, fetchedAt }),
    meta: {
      source_id: source.id, citation: sourceCitation, fetched_at: fetchedAt,
      requested_limit_per_dataset: limit, dataset_ids: TRADE_DATASETS.map(([dataset]) => dataset),
    },
  };
}

export async function loadTradeFlowProduct(fetcher: TradeFetcher = fetchResult, limit = 500): Promise<TradeFlowProduct> {
  if (fetcher !== fetchResult) return load(fetcher, limit);
  const now = Date.now();
  const current = cache.get(limit);
  if (current && current.expiresAt > now) return current.value;
  const value = load(fetcher, limit).catch((error) => {
    cache.delete(limit);
    throw error;
  });
  cache.set(limit, { expiresAt: now + SETTINGS.cacheTtlMs, value });
  return value;
}

export function clearTradeFlowCache(): void {
  cache.clear();
}
