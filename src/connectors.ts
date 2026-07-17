/**
 * Pluggable connectors: one fetch strategy per source `kind`.
 *
 *   http_json : plain JSON with records at `row_path` (MOIAT)
 *   ods       : OpenDataSoft Explore v2.1 (catalog + per-dataset records)
 *   ckan      : CKAN package_search + datastore_search
 *   arcgis    : Esri FeatureServer/MapServer query -> GeoJSON
 *   metadata  : discovery-only; never returns records (honest)
 *
 * Every fetch returns a `FetchResult` with full provenance + a data-quality
 * block. `fetchRecords` stays as a thin bare-list wrapper for back-compat.
 */

import { SETTINGS } from "./config.js";
import { SourceUnavailable, ValidationError } from "./errors.js";
import { getJson, probe } from "./http.js";
import { redactRecords } from "./redaction.js";
import { citation, fetchUrl, type Source } from "./sources.js";

type Rec = Record<string, unknown>;

export interface DataQuality {
  confidence: number;
  warnings: string[];
  validation: Record<string, unknown>;
}

export interface DatasetRef {
  id: string;
  title_en: string;
  title_ar: string;
  records_count: number | null;
  theme: string;
  modified: string;
  has_geo: boolean;
}

export interface FetchResult {
  records: Rec[];
  source_id: string;
  fetched_at: string;
  citation: string;
  license: string;
  dataset: string | null;
  total: number | null;
  fields: Rec[];
  data_quality: DataQuality;
}

export interface FetchOpts {
  dataset?: string | null;
  query?: string;
  limit?: number;
  offset?: number;
}

const utcNow = (): string => new Date().toISOString().replace(/\.\d+Z$/, "Z");

function dig(payload: unknown, path: string[]): unknown {
  let node: unknown = payload;
  for (const key of path) {
    if (node && typeof node === "object" && !Array.isArray(node)) {
      node = (node as Rec)[key];
    } else {
      return undefined;
    }
  }
  return node;
}

function coerceRecords(node: unknown): Rec[] {
  if (Array.isArray(node)) return node.filter((r) => r && typeof r === "object") as Rec[];
  if (node && typeof node === "object") return [node as Rec];
  return [];
}

function scoreConfidence(records: Rec[], total: number | null, clientFiltered: boolean): DataQuality {
  if (records.length === 0) {
    return { confidence: 0, warnings: ["no records returned"], validation: { records_out: 0, upstream_total: total } };
  }
  let confidence = total !== null ? 0.9 : 0.7;
  const warnings: string[] = [];
  if (clientFiltered) {
    confidence -= 0.1;
    warnings.push("results filtered client-side; upstream total may differ");
  }
  return {
    confidence: Math.max(0, Math.min(1, Number(confidence.toFixed(3)))),
    warnings,
    validation: { records_out: records.length, upstream_total: total },
  };
}

function result(source: Source, records: Rec[], extra: Partial<FetchResult> = {}): FetchResult {
  return {
    records,
    source_id: source.id,
    fetched_at: utcNow(),
    citation: citation(source),
    license: source.license,
    dataset: null,
    total: null,
    fields: [],
    data_quality: scoreConfidence(records, extra.total ?? null, false),
    ...extra,
  };
}

/** Envelope `meta` block for record endpoints/tools. */
export function metaOf(r: FetchResult): Rec {
  return {
    source_id: r.source_id,
    dataset: r.dataset,
    license: r.license,
    citation: r.citation,
    fetched_at: r.fetched_at,
    total: r.total,
    count: r.records.length,
    data_quality: r.data_quality,
  };
}

// ── http_json ────────────────────────────────────────────────────────────────
async function fetchHttpJson(source: Source, opts: FetchOpts): Promise<FetchResult> {
  const limit = opts.limit ?? 10;
  const params: Record<string, unknown> = { ...source.default_params };
  const capped = source.max_page_size ? Math.min(limit, source.max_page_size) : limit;
  params.PageSize = capped;
  const payload = await getJson(fetchUrl(source), params);
  let records = coerceRecords(dig(payload, source.row_path));
  let clientFiltered = false;
  if (opts.query) {
    const q = opts.query.toLowerCase();
    records = records.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
    clientFiltered = true;
  }
  records = redactRecords(records.slice(0, limit));
  return result(source, records, { total: null, data_quality: scoreConfidence(records, null, clientFiltered) });
}

// ── OpenDataSoft ─────────────────────────────────────────────────────────────
function odsApiBase(source: Source): string {
  const override = source.connector_config.api_base as string | undefined;
  return (override ?? source.base_url.replace(/\/+$/, "") + "/api/explore/v2.1").replace(/\/+$/, "");
}

function odsWhere(query?: string): Record<string, unknown> {
  if (!query) return {};
  return { where: `search("${query.replace(/"/g, '\\"')}")` };
}

async function fetchOds(source: Source, opts: FetchOpts): Promise<FetchResult> {
  const limit = opts.limit ?? 10;
  const dataset = opts.dataset ?? (source.connector_config.default_dataset as string | undefined) ?? null;
  if (!dataset) return result(source, [], { dataset: null });
  const url = `${odsApiBase(source)}/catalog/datasets/${dataset}/records`;
  const payload = (await getJson(url, { limit: Math.min(limit, 100), offset: opts.offset ?? 0, ...odsWhere(opts.query) })) as Rec;
  const records = redactRecords(coerceRecords(payload.results).slice(0, limit));
  const total = typeof payload.total_count === "number" ? payload.total_count : null;
  return result(source, records, { dataset, total, data_quality: scoreConfidence(records, total, false) });
}

async function odsDatasets(source: Source, opts: FetchOpts): Promise<DatasetRef[]> {
  const url = `${odsApiBase(source)}/catalog/datasets`;
  const payload = (await getJson(url, { limit: Math.min(opts.limit ?? 50, 100), offset: opts.offset ?? 0, ...odsWhere(opts.query) })) as Rec;
  const results = Array.isArray(payload.results) ? payload.results : [];
  return results.map((ds: unknown) => {
    const d = (ds ?? {}) as Rec;
    const metas = (((d.metas as Rec)?.default as Rec) ?? {}) as Rec;
    const features = Array.isArray(d.features) ? (d.features as unknown[]) : [];
    const theme = metas.theme;
    return {
      id: String(d.dataset_id ?? ""),
      title_en: String(metas.title ?? d.dataset_id ?? ""),
      title_ar: String(metas.title_ar ?? ""),
      records_count: typeof metas.records_count === "number" ? metas.records_count : null,
      theme: Array.isArray(theme) ? theme.join(", ") : String(theme ?? ""),
      modified: String(metas.modified ?? ""),
      has_geo: features.includes("geo"),
    };
  });
}

// ── CKAN ─────────────────────────────────────────────────────────────────────
function ckanAction(source: Source, action: string): string {
  const base = (source.connector_config.api_base as string | undefined) ?? source.base_url.replace(/\/+$/, "") + "/api/3/action";
  return base.replace(/\/+$/, "") + "/" + action;
}

async function fetchCkan(source: Source, opts: FetchOpts): Promise<FetchResult> {
  const limit = opts.limit ?? 10;
  const dataset = opts.dataset ?? (source.connector_config.default_resource as string | undefined) ?? null;
  if (!dataset) return result(source, [], { dataset: null });
  const params: Record<string, unknown> = { resource_id: dataset, limit: Math.min(limit, 100), offset: opts.offset ?? 0 };
  if (opts.query) params.q = opts.query;
  const payload = (await getJson(ckanAction(source, "datastore_search"), params)) as Rec;
  const r = (payload.result ?? {}) as Rec;
  const records = redactRecords(coerceRecords(r.records).slice(0, limit));
  const total = typeof r.total === "number" ? r.total : null;
  const fields = Array.isArray(r.fields) ? (r.fields.filter((f) => f && typeof f === "object") as Rec[]) : [];
  return result(source, records, { dataset, total, fields, data_quality: scoreConfidence(records, total, false) });
}

async function ckanDatasets(source: Source, opts: FetchOpts): Promise<DatasetRef[]> {
  const params: Record<string, unknown> = { rows: Math.min(opts.limit ?? 50, 100), start: opts.offset ?? 0 };
  if (opts.query) params.q = opts.query;
  const payload = await getJson(ckanAction(source, "package_search"), params);
  const packages = (dig(payload, ["result", "results"]) as unknown[]) ?? [];
  const refs: DatasetRef[] = [];
  for (const pkg of packages) {
    const p = (pkg ?? {}) as Rec;
    const title = String(p.title ?? p.name ?? "");
    const resources = Array.isArray(p.resources) ? p.resources : [];
    for (const res of resources) {
      const rr = (res ?? {}) as Rec;
      if (!rr.datastore_active) continue;
      const name = rr.name ?? rr.format ?? "";
      refs.push({
        id: String(rr.id ?? ""),
        title_en: `${title} — ${name}`.replace(/ — $/, ""),
        title_ar: String(p.title_ar ?? ""),
        records_count: null,
        theme: "",
        modified: String(rr.last_modified ?? p.metadata_modified ?? ""),
        has_geo: false,
      });
    }
  }
  return refs;
}

// ── ArcGIS ───────────────────────────────────────────────────────────────────
function arcgisService(source: Source): string {
  return String((source.connector_config.service_url as string | undefined) ?? fetchUrl(source)).replace(/\/+$/, "");
}

async function fetchArcgis(source: Source, opts: FetchOpts): Promise<FetchResult> {
  const limit = opts.limit ?? 10;
  const layer = opts.dataset ?? String(source.connector_config.default_layer ?? 0);
  const field = source.connector_config.text_search_field as string | undefined;
  let where = "1=1";
  let clientFiltered = false;
  const warnings: string[] = [];
  if (opts.query) {
    if (field) {
      where = `${field} LIKE '%${opts.query.replace(/'/g, "''")}%'`;
      clientFiltered = true;
    } else {
      warnings.push("text search not supported for this layer (no search field configured)");
    }
  }
  const url = `${arcgisService(source)}/${layer}/query`;
  const payload = (await getJson(url, { where, outFields: "*", resultRecordCount: Math.min(limit, 1000), resultOffset: opts.offset ?? 0, f: "geojson" })) as Rec;
  const features = Array.isArray(payload.features) ? payload.features : [];
  const flattened: Rec[] = features.slice(0, limit).map((feat) => {
    const f = (feat ?? {}) as Rec;
    const rec: Rec = { ...((f.properties as Rec) ?? {}) };
    if (f.geometry !== undefined) rec._geometry = f.geometry;
    return rec;
  });
  const records = redactRecords(flattened);
  const dq = scoreConfidence(records, null, clientFiltered);
  dq.warnings.push(...warnings);
  return result(source, records, { dataset: layer, total: null, data_quality: dq });
}

async function arcgisDatasets(source: Source, opts: FetchOpts): Promise<DatasetRef[]> {
  const payload = (await getJson(arcgisService(source), { f: "json" })) as Rec;
  const layers = Array.isArray(payload.layers) ? payload.layers : [];
  const tables = Array.isArray(payload.tables) ? payload.tables : [];
  const all = [...layers, ...tables].map((e, i) => {
    const entry = (e ?? {}) as Rec;
    return {
      id: String(entry.id ?? i),
      title_en: String(entry.name ?? entry.id ?? ""),
      title_ar: "",
      records_count: null,
      theme: "",
      modified: "",
      has_geo: i < layers.length,
    };
  });
  const offset = opts.offset ?? 0;
  return all.slice(offset, offset + (opts.limit ?? 50));
}

// ── dispatch ─────────────────────────────────────────────────────────────────
export async function fetchResult(source: Source, opts: FetchOpts = {}): Promise<FetchResult> {
  switch (source.kind) {
    case "http_json":
      return fetchHttpJson(source, opts);
    case "ods":
      return fetchOds(source, opts);
    case "ckan":
      return fetchCkan(source, opts);
    case "arcgis":
      return fetchArcgis(source, opts);
    case "metadata":
      throw new SourceUnavailable(
        `'${source.id}' is a discovery-only source and exposes no record API yet. See ${citation(source)} for the portal's published datasets.`,
      );
    default:
      throw new ValidationError(`no connector for kind: ${source.kind}`);
  }
}

export async function fetchRecords(source: Source, opts: { query?: string; limit?: number; dataset?: string | null } = {}): Promise<Rec[]> {
  return (await fetchResult(source, opts)).records;
}

export async function listDatasets(source: Source, opts: FetchOpts = {}): Promise<DatasetRef[]> {
  switch (source.kind) {
    case "ods":
      return odsDatasets(source, opts);
    case "ckan":
      return ckanDatasets(source, opts);
    case "arcgis":
      return arcgisDatasets(source, opts);
    case "http_json":
      return [{ id: source.id, title_en: source.name_en, title_ar: source.name_ar, records_count: null, theme: "", modified: "", has_geo: false }];
    default:
      return [];
  }
}

export interface HealthResult {
  source_id: string;
  status: "ok" | "partial" | "down";
  message: string;
  checked_url: string;
  record_count: number;
  latency_ms: number;
}

export async function checkHealth(source: Source): Promise<HealthResult> {
  const started = Date.now();
  const url = source.kind !== "metadata" ? fetchUrl(source) : source.base_url;
  try {
    if (source.kind === "metadata") {
      await probe(url, SETTINGS.healthTimeoutMs);
      return { source_id: source.id, status: "ok", message: "Portal reachable (discovery-only source).", checked_url: url, record_count: 0, latency_ms: Date.now() - started };
    }
    if ((source.kind === "ods" || source.kind === "ckan") && !source.connector_config.default_dataset) {
      const datasets = await listDatasets(source, { limit: 1 });
      return {
        source_id: source.id,
        status: datasets.length ? "ok" : "partial",
        message: datasets.length ? "Catalog API answered; datasets discoverable." : "Catalog API reachable but returned no datasets.",
        checked_url: url,
        record_count: 0,
        latency_ms: Date.now() - started,
      };
    }
    const r = await fetchResult(source, { limit: 5 });
    return {
      source_id: source.id,
      status: r.records.length ? "ok" : "partial",
      message: r.records.length ? "Fetched a small live sample from the official source." : "Source reachable but returned no sample records.",
      checked_url: url,
      record_count: r.records.length,
      latency_ms: Date.now() - started,
    };
  } catch (err) {
    return { source_id: source.id, status: "down", message: err instanceof Error ? `${err.name}: ${err.message}` : String(err), checked_url: url, record_count: 0, latency_ms: Date.now() - started };
  }
}
