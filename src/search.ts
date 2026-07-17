/**
 * Federated, bilingual search across the catalog (and optionally live datasets).
 * Shallow search ranks the registry offline; deep search also queries each
 * multi-dataset portal, bounded so one slow portal can't stall the whole search.
 */

import { connectorCapabilities, listDatasets } from "./connectors.js";
import { SETTINGS } from "./config.js";
import { postJson } from "./http.js";
import { citation, REGISTRY, type Source } from "./sources.js";
import { expandQuery, normalizeText, recognizeConcepts } from "./glossary.js";

type Rec = Record<string, unknown>;

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

let embeddingProvider: EmbeddingProvider | null = null;

export function setEmbeddingProvider(provider: EmbeddingProvider | null): void {
  embeddingProvider = provider;
}

export function configureEmbeddingProvider(): void {
  if (!SETTINGS.embeddingEndpoint) return;
  setEmbeddingProvider({
    async embed(texts) {
      const headers = SETTINGS.embeddingApiKey ? { Authorization: `Bearer ${SETTINGS.embeddingApiKey}` } : undefined;
      const payload = await postJson(SETTINGS.embeddingEndpoint!, { model: SETTINGS.embeddingModel, input: texts }, SETTINGS.httpTimeoutMs, headers) as Rec;
      const data = Array.isArray(payload.data) ? payload.data as Rec[] : [];
      const vectors = [...data].sort((left, right) => Number(left.index) - Number(right.index)).map((item) => item.embedding);
      if (vectors.length !== texts.length || vectors.some((vector) => !Array.isArray(vector))) throw new Error("embedding endpoint returned an invalid response");
      return vectors as number[][];
    },
  });
}

configureEmbeddingProvider();

function cosine(left: number[], right: number[]): number {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0; let leftNorm = 0; let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index]; const b = right[index];
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    dot += a * b; leftNorm += a * a; rightNorm += b * b;
  }
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
}

async function embeddingRerank(query: string, sources: Rec[]): Promise<Rec[]> {
  if (!embeddingProvider || !sources.length) return sources;
  const descriptions = sources.map((source) => `${source.name_en ?? ""} ${source.name_ar ?? ""} ${source.category ?? ""}`);
  const vectors = await embeddingProvider.embed([query, ...descriptions]);
  if (vectors.length !== sources.length + 1) throw new Error("embedding provider returned an invalid vector count");
  const queryVector = vectors[0];
  return sources.map((source, index) => {
    const semantic = Math.max(0, cosine(queryVector, vectors[index + 1]));
    const lexical = Number(source.score ?? 0);
    return { ...source, score: Number((lexical + semantic * 10).toFixed(4)), ranking: { ...(source.ranking as Rec), embedding_cosine: Number(semantic.toFixed(4)) } };
  }).sort((left, right) => Number(right.score) - Number(left.score));
}

function tokens(value: string): string[] {
  return normalizeText(value).split(/\s+/).filter((token) => token.length > 1);
}

function document(source: Source): string[] {
  const strong = `${source.id} ${source.name_en} ${source.name_ar}`;
  return tokens(`${strong} ${strong} ${strong} ${source.owner} ${source.category} ${source.notes}`);
}

interface Ranked { source: Source; score: number; bm25: number; exact: number; matched: string[] }

function rankSources(sources: Source[], query: string): Ranked[] {
  const expanded = expandQuery(query);
  const queryTokens = [...new Set(expanded.flatMap(tokens))];
  if (!queryTokens.length) return [];
  const docs = sources.map((source) => ({ source, terms: document(source) }));
  const averageLength = docs.reduce((sum, item) => sum + item.terms.length, 0) / Math.max(1, docs.length);
  const frequencies = new Map<string, number>();
  for (const term of queryTokens) frequencies.set(term, docs.filter((item) => item.terms.includes(term)).length);
  const k1 = 1.2;
  const b = 0.75;
  return docs.map(({ source, terms }) => {
    const counts = new Map<string, number>();
    for (const term of terms) counts.set(term, (counts.get(term) ?? 0) + 1);
    let bm25 = 0;
    const matched: string[] = [];
    for (const term of queryTokens) {
      const tf = counts.get(term) ?? 0;
      if (!tf) continue;
      matched.push(term);
      const df = frequencies.get(term) ?? 0;
      const idf = Math.log(1 + (sources.length - df + 0.5) / (df + 0.5));
      bm25 += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * terms.length / Math.max(1, averageLength))));
    }
    const normalizedId = normalizeText(source.id);
    const normalizedQuery = normalizeText(query);
    const exact = normalizedId === normalizedQuery ? 100 : normalizedId.includes(normalizedQuery) ? 20 : 0;
    return { source, bm25, exact, matched, score: exact + bm25 };
  }).filter((item) => item.score > 0).sort((left, right) => right.score - left.score || left.source.id.localeCompare(right.source.id));
}

export function searchSources(q: string, limit = 20): Rec[] {
  return rankSources(REGISTRY.list(), q)
    .slice(0, limit)
    .map(({ source: s, score, bm25, exact, matched }) => ({
      type: "source",
      source_id: s.id,
      name_en: s.name_en,
      name_ar: s.name_ar,
      kind: s.kind,
      category: s.category,
      citation: citation(s),
      score: Number(score.toFixed(4)),
      matched_terms: matched,
      ranking: { method: "hybrid_bm25_glossary", bm25: Number(bm25.toFixed(4)), exact_boost: exact },
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
  let sources = searchSources(q, opts.limit ?? 20);
  let ranking = "hybrid_bm25_glossary";
  let embeddingWarning: string | null = null;
  if (embeddingProvider) {
    try {
      sources = await embeddingRerank(q, sources);
      ranking = "hybrid_bm25_embedding_glossary";
    } catch (error) {
      embeddingWarning = error instanceof Error ? error.message : String(error);
    }
  }
  let datasets: Rec[] = [];
  if (opts.deep) {
    const portals = REGISTRY.list().filter((source) => connectorCapabilities(source.kind)?.datasets === true);
    const groups = await Promise.all(portals.map((s) => portalDatasets(s, q, opts.perSource ?? 5)));
    datasets = groups.flat();
  }
  return { query: q, entities: recognizeConcepts(q), ranking, embedding_warning: embeddingWarning, sources, datasets, counts: { sources: sources.length, datasets: datasets.length } };
}
