/**
 * Federated, bilingual search across the catalog (and optionally live datasets).
 * Shallow search ranks the registry offline; deep search also queries each
 * multi-dataset portal, bounded so one slow portal can't stall the whole search.
 */

import { listDatasets } from "./connectors.js";
import { citation, REGISTRY, type Source } from "./sources.js";
import { expandQuery, normalizeText } from "./glossary.js";

type Rec = Record<string, unknown>;

function score(source: Source, q: string): number {
  const terms = expandQuery(q);
  if (!terms.length || !terms[0]) return 0;
  const strong = normalizeText(`${source.id} ${source.name_en} ${source.name_ar}`);
  const weak = normalizeText(`${source.owner} ${source.category} ${source.notes}`);
  let s = 0;
  for (const term of terms) {
    if (term === normalizeText(source.id)) s = Math.max(s, 100);
    if (normalizeText(source.id).includes(term)) s = Math.max(s, 20);
    if (strong.includes(term)) s = Math.max(s, 15);
    const tokens = term.split(/\s+/).filter(Boolean);
    s += 3 * tokens.filter((token) => strong.includes(token)).length;
    s += tokens.filter((token) => weak.includes(token)).length;
  }
  return s;
}

export function searchSources(q: string, limit = 20): Rec[] {
  return REGISTRY.list()
    .map((s) => ({ s, sc: score(s, q) }))
    .filter((x) => x.sc > 0)
    .sort((a, b) => b.sc - a.sc)
    .slice(0, limit)
    .map(({ s, sc }) => ({
      type: "source",
      source_id: s.id,
      name_en: s.name_en,
      name_ar: s.name_ar,
      kind: s.kind,
      category: s.category,
      citation: citation(s),
      score: Number(sc.toFixed(2)),
    }));
}

async function portalDatasets(source: Source, q: string, perSource: number): Promise<Rec[]> {
  try {
    const refs = await Promise.race([
      listDatasets(source, { query: q, limit: perSource }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 6000)),
    ]);
    return refs.map((r) => ({
      type: "dataset",
      source_id: source.id,
      dataset: r.id,
      title_en: r.title_en,
      title_ar: r.title_ar,
      records_count: r.records_count,
      has_geo: r.has_geo,
    }));
  } catch {
    return [];
  }
}

export async function buildSearch(q: string, opts: { limit?: number; deep?: boolean; perSource?: number } = {}): Promise<Rec> {
  const sources = searchSources(q, opts.limit ?? 20);
  let datasets: Rec[] = [];
  if (opts.deep) {
    const portals = REGISTRY.list().filter((s) => s.kind === "ckan" || s.kind === "ods" || s.kind === "arcgis");
    const groups = await Promise.all(portals.map((s) => portalDatasets(s, q, opts.perSource ?? 5)));
    datasets = groups.flat();
  }
  return { query: q, sources, datasets, counts: { sources: sources.length, datasets: datasets.length } };
}
