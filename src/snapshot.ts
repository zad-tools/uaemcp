/** Source-backed market snapshot for a topic (read-only, always attributed). */

import { fetchRecords } from "./connectors.js";
import { citation, REGISTRY } from "./sources.js";

const TOPIC_SOURCE: Record<string, string> = {
  industry: "moiat_industrial_licenses",
  industrial: "moiat_industrial_licenses",
  manufacturing: "moiat_industrial_licenses",
  sme: "moiat_industrial_licenses",
};

function top(counts: Map<string, number>, n = 8): { name: string; count: number }[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

function bump(map: Map<string, number>, key: unknown): void {
  if (typeof key === "string" && key) map.set(key, (map.get(key) ?? 0) + 1);
}

export async function buildMarketSnapshot(topic: string, limit = 100) {
  const sourceId = TOPIC_SOURCE[topic.toLowerCase().trim()] ?? "moiat_industrial_licenses";
  const source = REGISTRY.get(sourceId);
  const records = await fetchRecords(source, { limit });

  const emirates = new Map<string, number>();
  const areas = new Map<string, number>();
  const products = new Map<string, number>();
  for (const r of records) {
    bump(emirates, r.EmirateNameEN);
    bump(areas, r.AreaNameEN);
    const prods = r.Products;
    if (Array.isArray(prods)) {
      for (const p of prods) {
        if (p && typeof p === "object") bump(products, (p as Record<string, unknown>).ProductNameEN);
      }
    }
  }

  return {
    topic,
    source: {
      id: source.id,
      name_en: source.name_en,
      name_ar: source.name_ar,
      license: source.license,
      citation: citation(source),
    },
    sample_size: records.length,
    emirates: top(emirates),
    areas: top(areas),
    products: top(products),
  };
}
