import { aggregate, type Metric } from "./aggregate.js";
import { requireWrite } from "./auth.js";
import { checkHealth, fetchResult, listDatasets, metaOf } from "./connectors.js";
import { buildDashboardSummary } from "./dashboard.js";
import { UaemcpError, SourceNotFound, Unauthorized, ValidationError } from "./errors.js";
import { exportRecords, FORMATS, type ExportFormat } from "./export.js";
import * as geo from "./geo.js";
import { buildSearch } from "./search.js";
import { buildMarketSnapshot } from "./snapshot.js";
import { citation, REGISTRY } from "./sources.js";

type Json = Record<string, unknown>;

const envelope = (data: unknown, meta: Json = {}): Json => ({ ok: true, data, error: null, meta });

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: { "cache-control": "no-store" } });
}

function failure(error: unknown): Response {
  const status = error instanceof SourceNotFound ? 404 : error instanceof Unauthorized ? 401 : error instanceof ValidationError ? 422 : 502;
  const code = error instanceof SourceNotFound ? "NOT_FOUND" : error instanceof Unauthorized ? "UNAUTHORIZED" : error instanceof ValidationError ? "VALIDATION_ERROR" : "UPSTREAM_ERROR";
  const message = error instanceof Error ? error.message : "Unexpected error";
  return json({ ok: false, data: null, error: { code, message }, meta: {} }, status);
}

function integer(params: URLSearchParams, key: string, fallback: number, max: number): number {
  const raw = params.get(key);
  const value = raw === null ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new ValidationError(`${key} must be a non-negative integer`);
  return Math.min(value, max);
}

const optional = (params: URLSearchParams, key: string): string | undefined => params.get(key) || undefined;
const landing = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Open Emirates Intelligence</title><style>body{margin:0;background:#090b0d;color:#e8f0e8;font:16px ui-monospace,monospace}main{max-width:920px;margin:0 auto;padding:10vh 24px}h1{font-size:clamp(42px,8vw,88px);line-height:.95;margin:0 0 28px}p{color:#a9b4ad;line-height:1.7;max-width:720px}code{color:#6eff9a}.bar{border-top:1px solid #29302b;margin-top:48px;padding-top:20px}</style></head><body><main><p>UAE / OPEN DATA / MCP</p><h1>Open Emirates<br>Intelligence</h1><p>Source-cited official UAE open data for agents and applications. Bun-powered, open source, bilingual, and safe to self-host.</p><div class="bar"><p>MCP <code>/mcp</code> · REST <code>/api/v1</code> · Health <code>/health</code></p></div></main></body></html>`;

export async function handleRest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  try {
    if (request.method === "GET" && path === "/") return new Response(landing, { headers: { "content-type": "text/html; charset=utf-8" } });

    if (path === "/api/v1/sources" && request.method === "GET") {
      const sources = REGISTRY.list();
      return json(envelope(sources, { total: sources.length }));
    }
    if (path === "/api/v1/sources" && request.method === "POST") {
      requireWrite(request.headers.get("x-api-key"));
      const body = await request.json() as Record<string, string>;
      return json(envelope(REGISTRY.addMetadataSource(body)), 201);
    }

    if (request.method === "GET" && path === "/api/v1/search") {
      const q = url.searchParams.get("q")?.trim();
      if (!q) throw new ValidationError("q is required");
      const limit = Math.max(1, integer(url.searchParams, "limit", 20, 100));
      const deep = url.searchParams.get("deep") === "true";
      const data = await buildSearch(q, { limit, deep });
      return json(envelope(data, data.counts as Json));
    }
    if (request.method === "GET" && path === "/api/v1/intelligence/dashboard-summary") return json(envelope(await buildDashboardSummary()));
    if (request.method === "GET" && path === "/api/v1/intelligence/market-snapshot") {
      return json(envelope(await buildMarketSnapshot(url.searchParams.get("topic") || "industry", Math.max(1, integer(url.searchParams, "limit", 100, 200)))));
    }

    const match = path.match(/^\/api\/v1\/sources\/([^/]+)(?:\/(health|datasets|records|geo|aggregate|export))?$/);
    if (!match || request.method !== "GET") return null;
    const source = REGISTRY.get(decodeURIComponent(match[1]));
    const action = match[2];
    if (!action) return json(envelope(source));
    if (action === "health") return json(envelope(await checkHealth(source)));

    const query = optional(url.searchParams, "query");
    const dataset = optional(url.searchParams, "dataset");
    const offset = integer(url.searchParams, "offset", 0, Number.MAX_SAFE_INTEGER);
    if (action === "datasets") {
      const limit = Math.max(1, integer(url.searchParams, "limit", 50, 100));
      const data = await listDatasets(source, { query, limit, offset });
      return json(envelope(data, { source_id: source.id, kind: source.kind, citation: citation(source), count: data.length, limit, offset }));
    }

    const limit = Math.max(1, integer(url.searchParams, "limit", action === "records" ? 10 : 500, action === "records" ? 100 : 1000));
    const result = await fetchResult(source, { query, dataset, limit, offset });
    if (action === "records") return json(envelope(result.records, { ...metaOf(result), limit, offset }));
    if (action === "geo") {
      const bbox = optional(url.searchParams, "bbox");
      const near = optional(url.searchParams, "near");
      const filtered = geo.filterRecords(result.records, source, { bbox: bbox ? geo.parseBbox(bbox) : undefined, near: near ? geo.parseNear(near) : undefined });
      return json(envelope(geo.toGeoJson(filtered, source, dataset ?? null), { source_id: source.id, citation: citation(source), scanned: result.records.length, matched: filtered.length }));
    }
    if (action === "aggregate") {
      const fields = (url.searchParams.get("group_by") || "").split(",").map((field) => field.trim()).filter(Boolean);
      if (!fields.length) throw new ValidationError("group_by is required");
      const metric = (url.searchParams.get("metric") || "count") as Metric;
      const groups = aggregate(result.records, { group_by: fields, metric, value_field: optional(url.searchParams, "value_field"), top: Math.max(1, integer(url.searchParams, "top", 20, 200)) });
      return json(envelope(groups, { source_id: source.id, group_by: fields, metric, sample_size: result.records.length, citation: citation(source) }));
    }
    if (action === "export") {
      const format = (url.searchParams.get("format") || "json") as ExportFormat;
      if (!FORMATS.includes(format)) throw new ValidationError(`format must be one of ${FORMATS.join(", ")}`);
      const file = exportRecords(result.records, format, source, dataset ?? null);
      const body = file.body.buffer.slice(file.body.byteOffset, file.body.byteOffset + file.body.byteLength) as ArrayBuffer;
      return new Response(body, { headers: { "content-type": file.media, "content-disposition": `attachment; filename="${file.filename}"` } });
    }
    return null;
  } catch (error) {
    if (!(error instanceof UaemcpError) && error instanceof Error && /metric must|requires a value_field|bbox|near/.test(error.message)) return failure(new ValidationError(error.message));
    return failure(error);
  }
}
