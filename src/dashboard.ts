/**
 * Dashboard summary — concurrent, timeout-bounded, cached.
 *
 * Every source is probed in parallel with a strict per-source timeout, so
 * worst-case latency is ~the slowest single source, not the sum of all. A
 * short-lived cache keeps repeated loads instant. This is the fix for the
 * prior server's sequential, unbounded, hang-prone dashboard.
 */

import { SETTINGS } from "./config.js";
import { checkHealth, type HealthResult } from "./connectors.js";
import { citation, REGISTRY, type Source } from "./sources.js";

let cache: { at: number; value: DashboardSummary } | null = null;

export interface DashboardSummary {
  generated_at: string;
  elapsed_ms: number;
  total_sources: number;
  status_counts: Record<string, number>;
  category_counts: Record<string, number>;
  sources: {
    id: string;
    name_en: string;
    name_ar: string;
    category: string;
    status: string;
    latency_ms: number;
    citation: string;
  }[];
  cached: boolean;
}

function withTimeout(source: Source): Promise<HealthResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({
        source_id: source.id,
        status: "down",
        message: `probe exceeded ${SETTINGS.healthTimeoutMs}ms budget`,
        checked_url: source.base_url,
        record_count: 0,
        latency_ms: SETTINGS.healthTimeoutMs,
      });
    }, SETTINGS.healthTimeoutMs);
    checkHealth(source)
      .then((r) => {
        clearTimeout(timer);
        resolve(r);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve({
          source_id: source.id,
          status: "down",
          message: "health check failed",
          checked_url: source.base_url,
          record_count: 0,
          latency_ms: Date.now(),
        });
      });
  });
}

export async function buildDashboardSummary(
  opts: { useCache?: boolean; now?: number } = {},
): Promise<DashboardSummary> {
  const useCache = opts.useCache ?? true;
  const now = opts.now ?? Date.now();
  if (useCache && cache && now - cache.at < SETTINGS.cacheTtlMs) {
    return { ...cache.value, cached: true };
  }

  const started = Date.now();
  const sources = REGISTRY.list();
  const checks = await Promise.all(sources.map((s) => withTimeout(s)));

  const statusCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  sources.forEach((s, i) => {
    const st = checks[i].status;
    statusCounts[st] = (statusCounts[st] ?? 0) + 1;
    categoryCounts[s.category] = (categoryCounts[s.category] ?? 0) + 1;
  });

  const summary: DashboardSummary = {
    generated_at: new Date(now).toISOString(),
    elapsed_ms: Date.now() - started,
    total_sources: sources.length,
    status_counts: statusCounts,
    category_counts: categoryCounts,
    sources: sources.map((s, i) => ({
      id: s.id,
      name_en: s.name_en,
      name_ar: s.name_ar,
      category: s.category,
      status: checks[i].status,
      latency_ms: checks[i].latency_ms,
      citation: citation(s),
    })),
    cached: false,
  };
  cache = { at: now, value: summary };
  return summary;
}

/** Test hook: reset the module-level cache. */
export function _clearCache(): void {
  cache = null;
}
