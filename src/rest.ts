import { aggregate, type Metric } from "./aggregate.js";
import { requireWrite } from "./auth.js";
import { checkHealth, connectorKinds, fetchResult, listDatasets, metaOf } from "./connectors.js";
import { buildDashboardSummary } from "./dashboard.js";
import { UaemcpError, SourceNotFound, Unauthorized, ValidationError } from "./errors.js";
import { exportRecords, FORMATS, type ExportFormat } from "./export.js";
import * as geo from "./geo.js";
import { buildSearch } from "./search.js";
import { buildMarketSnapshot } from "./snapshot.js";
import { citation, REGISTRY, type CustomSourceInput } from "./sources.js";
import { coverageSummary, datasetModel, portalModel } from "./catalog.js";
import { inferSchema } from "./schema.js";
import { trustManifest } from "./manifest.js";
import { VERSION } from "./version.js";
import { reliabilityStore } from "./reliability.js";
import { listRecipes, runRecipe, type RecipeId, RECIPE_IDS } from "./intelligence.js";
import { landingPage } from "./web.js";
import { snapshotScheduler } from "./scheduler.js";
import { encodeVectorTile } from "./vector-tiles.js";
import { openApiDocument } from "./openapi.js";
import { resolveEntities } from "./entity-resolution.js";
import { observatoryPage } from "./observatory-web.js";
import { healthScanScheduler } from "./health-scheduler.js";
import { coverageIndicator, healthIndicator, INDICATOR_IDS, industrialDistributionIndicator, listIndicators, stabilityIndicator, type IndicatorId } from "./indicators.js";
import { buildIndustryAtlas } from "./industry-atlas.js";
import { industryAtlasPage } from "./industry-atlas-web.js";
import { buildIndustrialChangeReport } from "./industry-change.js";
import { placesExplorerPage } from "./places-web.js";
import { buildTaxServiceReport } from "./tax-services.js";
import { taxServicesPage } from "./tax-services-web.js";
import { buildTaxArchive, loadTaxArchiveViews, TAX_ARCHIVE_SPECS } from "./tax-archive.js";
import { taxArchivePage } from "./tax-archive-web.js";
import { loadTradeFlowProduct } from "./trade-flow-service.js";
import { tradeFlowPage } from "./trade-flow-web.js";
import { listProducts } from "./products.js";
import type { RuntimeDependencies } from "./dependencies.js";

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

const REST_DEFAULTS: RuntimeDependencies = { fetchIndustryRecords: fetchResult, fetchTaxRecords: fetchResult };

export async function handleRest(request: Request, dependencies: RuntimeDependencies = REST_DEFAULTS): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  try {
    if (request.method === "GET" && path === "/") return new Response(landingPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/observatory") return new Response(observatoryPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/industry-atlas") return new Response(industryAtlasPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/places") return new Response(placesExplorerPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/tax-services") return new Response(taxServicesPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/tax-services/archive") return new Response(taxArchivePage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/trade-flow") return new Response(tradeFlowPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/openapi.json") return json(openApiDocument(url.origin));
    if (request.method === "GET" && path === "/.well-known/uaemcp.json") return json(trustManifest());
    if (request.method === "GET" && path === "/api/v1/coverage") return json(envelope(coverageSummary()));
    if (request.method === "GET" && path === "/api/v1/products") {
      const products = listProducts();
      return json(envelope(products, { total: products.length, published: products.filter((product) => product.status === "published").length }));
    }
    if (request.method === "GET" && path === "/api/v1/tax-services") {
      const source = REGISTRY.get("fta_service_activity_2025");
      const result = await (dependencies.fetchTaxRecords ?? fetchResult)(source, { limit: 10 });
      return json(envelope(buildTaxServiceReport(result.records, { citation: result.citation, fetchedAt: result.fetched_at }), {
        source_id: source.id, citation: result.citation, fetched_at: result.fetched_at,
        returned_records: result.records.length, data_quality: result.data_quality,
      }));
    }
    if (request.method === "GET" && path === "/api/v1/tax-services/archive") {
      const views = await loadTaxArchiveViews(dependencies.fetchTaxArchiveRecords ?? fetchResult);
      return json(envelope(buildTaxArchive(views), { source_ids: TAX_ARCHIVE_SPECS.map(([sourceId]) => sourceId), comparison_status: "unavailable" }));
    }
    if (request.method === "GET" && path === "/api/v1/trade-flow") {
      const requestedLimit = integer(url.searchParams, "limit", 500, 1000);
      if (requestedLimit < 1) throw new ValidationError("limit must be at least 1");
      const product = await loadTradeFlowProduct(dependencies.fetchTradeRecords ?? fetchResult, requestedLimit);
      return json(envelope(product.data, product.meta));
    }
    if (request.method === "GET" && path === "/api/v1/industry-atlas/change") {
      const source = REGISTRY.get("moiat_industrial_licenses");
      const store = reliabilityStore();
      const snapshots = store.listSnapshots(source.id, null, 100);
      const diff = snapshots.length >= 2 ? store.diffSnapshots(Number(snapshots[1].id), Number(snapshots[0].id)) : undefined;
      return json(envelope(buildIndustrialChangeReport(snapshots, diff), {
        source_id: source.id, citation: citation(source), snapshot_policy: "changed_content_only",
      }));
    }
    if (request.method === "GET" && path === "/api/v1/industry-atlas") {
      const source = REGISTRY.get("moiat_industrial_licenses");
      const requestedLimit = Math.max(1, integer(url.searchParams, "limit", 500, 1000));
      const result = await (dependencies.fetchIndustryRecords ?? fetchResult)(source, { limit: requestedLimit });
      const data = buildIndustryAtlas(result.records, {
        sourceId: source.id, citation: result.citation, fetchedAt: result.fetched_at,
        upstreamTotal: result.total, qualityScore: result.data_quality.quality_score,
        emirate: optional(url.searchParams, "emirate"), query: optional(url.searchParams, "q"),
      });
      return json(envelope(data, {
        source_id: source.id, citation: result.citation, fetched_at: result.fetched_at,
        requested_limit: requestedLimit, returned_records: result.records.length, data_quality: result.data_quality,
      }));
    }
    if (request.method === "GET" && path === "/api/v1/observatory") {
      return json(envelope(reliabilityStore().observatoryReport(REGISTRY.list().map((source) => source.id))));
    }
    if (request.method === "GET" && path === "/api/v1/observatory/report.md") {
      const report = reliabilityStore().observatoryReport(REGISTRY.list().map((source) => source.id)) as {
        generatedAt: string; monitoredSources: number; observedSources: number; overallUptimeRatio: number | null;
        currentStatus: Record<string, number>; incidents: Record<string, number>; sources: Array<Record<string, unknown>>;
      };
      const safe = (value: unknown) => String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
      const rows = report.sources.map((source) => `| ${safe(source.sourceId)} | ${safe(source.status)} | ${safe(source.latencyMs)} | ${safe(source.checkedAt)} |`).join("\n");
      const markdown = `# Emirates Open Data Observatory Report\n\nGenerated: ${report.generatedAt}\n\n## National reliability summary\n\n- Monitored sources: ${report.monitoredSources}\n- Sources with observations: ${report.observedSources}\n- Healthy now: ${report.currentStatus.ok ?? 0}\n- Degraded now: ${report.currentStatus.partial ?? 0}\n- Down now: ${report.currentStatus.down ?? 0}\n- Unknown: ${report.currentStatus.unknown ?? 0}\n- Observed uptime: ${report.overallUptimeRatio === null ? "unknown" : `${(report.overallUptimeRatio * 100).toFixed(2)}%`}\n- Open incidents: ${report.incidents.open ?? 0}\n\n> Unknown means unmeasured, not healthy. This report is derived only from stored observations.\n\n## Source status\n\n| Source | Status | Latency ms | Last checked |\n| --- | --- | ---: | --- |\n${rows}\n`;
      return new Response(markdown, { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": "inline; filename=emirates-open-data-observatory.md" } });
    }
    if (request.method === "GET" && path === "/api/v1/observatory/incidents") {
      const limit = Math.max(1, integer(url.searchParams, "limit", 100, 1000));
      return json(envelope(reliabilityStore().incidents(optional(url.searchParams, "source_id"), limit), { limit }));
    }
    const observatorySourceMatch = path.match(/^\/api\/v1\/observatory\/sources\/([^/]+)$/);
    if (request.method === "GET" && observatorySourceMatch) {
      const source = REGISTRY.get(decodeURIComponent(observatorySourceMatch[1]));
      const limit = Math.max(1, integer(url.searchParams, "limit", 100, 1000));
      return json(envelope({
        source,
        reliability: reliabilityStore().healthHistory(source.id, limit),
        incidents: reliabilityStore().incidents(source.id, limit),
        citation: citation(source),
      }));
    }
    if (request.method === "GET" && path === "/api/v1/operations/snapshot-scheduler") return json(envelope(snapshotScheduler.status()));
    if (request.method === "GET" && path === "/api/v1/operations/health-scan-scheduler") return json(envelope(healthScanScheduler.status()));
    if (request.method === "GET" && path === "/api/v1/catalog") {
      return json(envelope(REGISTRY.list().map(portalModel), { coverage: coverageSummary() }));
    }
    const portalMatch = path.match(/^\/api\/v1\/catalog\/portals\/([^/]+)$/);
    if (request.method === "GET" && portalMatch) return json(envelope(portalModel(REGISTRY.get(decodeURIComponent(portalMatch[1])))));

    if (path === "/api/v1/sources" && request.method === "GET") {
      const sources = REGISTRY.list();
      return json(envelope(sources, { total: sources.length }));
    }
    if (path === "/api/v1/sources" && request.method === "POST") {
      requireWrite(request.headers.get("x-api-key"));
      const body = await request.json() as CustomSourceInput;
      if (!connectorKinds().includes(String(body.kind ?? "metadata"))) throw new ValidationError(`connector is not installed: ${body.kind}`);
      return json(envelope(REGISTRY.addSource(body)), 201);
    }

    if (request.method === "GET" && path === "/api/v1/search") {
      const q = url.searchParams.get("q")?.trim();
      if (!q) throw new ValidationError("q is required");
      const limit = Math.max(1, integer(url.searchParams, "limit", 20, 100));
      const deep = url.searchParams.get("deep") === "true";
      const data = await buildSearch(q, { limit, deep });
      return json(envelope(data, data.counts as Json));
    }
    if (request.method === "GET" && path === "/api/v1/spatial/join") {
      const leftSource = REGISTRY.get(optional(url.searchParams, "left_source") ?? "");
      const rightSource = REGISTRY.get(optional(url.searchParams, "right_source") ?? "");
      const radiusKm = Number(url.searchParams.get("radius_km") ?? 1);
      const sampleLimit = Math.max(1, integer(url.searchParams, "limit", 100, 200));
      const maxMatches = Math.max(1, integer(url.searchParams, "max_matches", 500, 2000));
      const [left, right] = await Promise.all([
        fetchResult(leftSource, { dataset: optional(url.searchParams, "left_dataset"), limit: sampleLimit }),
        fetchResult(rightSource, { dataset: optional(url.searchParams, "right_dataset"), limit: sampleLimit }),
      ]);
      const matches = geo.spatialJoin(left.records, leftSource, right.records, rightSource, radiusKm, maxMatches);
      return json(envelope(matches, {
        left_source: leftSource.id, right_source: rightSource.id, radius_km: radiusKm,
        left_scanned: left.records.length, right_scanned: right.records.length, matches: matches.length,
        citations: [citation(leftSource), citation(rightSource)],
        lineage: [{ operation: "fetch_pair", connectors: [leftSource.kind, rightSource.kind] }, { operation: "point_radius_spatial_join", radius_km: radiusKm }],
      }));
    }
    if (request.method === "GET" && path === "/api/v1/entities/resolve") {
      const leftSource = REGISTRY.get(optional(url.searchParams, "left_source") ?? "");
      const rightSource = REGISTRY.get(optional(url.searchParams, "right_source") ?? "");
      const leftFields = (optional(url.searchParams, "left_fields") ?? "").split(",").map((field) => field.trim()).filter(Boolean);
      const rightFields = (optional(url.searchParams, "right_fields") ?? "").split(",").map((field) => field.trim()).filter(Boolean);
      const limit = Math.max(1, integer(url.searchParams, "limit", 100, 200));
      const maxMatches = Math.max(1, integer(url.searchParams, "max_matches", 500, 5000));
      const [left, right] = await Promise.all([
        fetchResult(leftSource, { dataset: optional(url.searchParams, "left_dataset"), limit }),
        fetchResult(rightSource, { dataset: optional(url.searchParams, "right_dataset"), limit }),
      ]);
      const resolved = resolveEntities(left.records, leftFields, right.records, rightFields, maxMatches);
      return json(envelope(resolved, { citations: [citation(leftSource), citation(rightSource)], lineage: [{ operation: "fetch_pair" }, { operation: "bilingual_normalized_exact_resolution", left_fields: leftFields, right_fields: rightFields }] }));
    }
    if (request.method === "GET" && path === "/api/v1/intelligence/dashboard-summary") return json(envelope(await buildDashboardSummary({ recordHistory: true })));
    if (request.method === "GET" && path === "/api/v1/intelligence/indicators") return json(envelope(listIndicators()));
    const indicatorMatch = path.match(/^\/api\/v1\/intelligence\/indicators\/([^/]+)$/);
    if (request.method === "GET" && indicatorMatch) {
      const indicator = decodeURIComponent(indicatorMatch[1]) as IndicatorId;
      if (!INDICATOR_IDS.includes(indicator)) throw new ValidationError(`indicator must be one of ${INDICATOR_IDS.join(", ")}`);
      if (indicator === "open_data_coverage") return json(envelope(coverageIndicator()));
      if (indicator === "api_health_score") return json(envelope(healthIndicator(reliabilityStore())));
      const source = REGISTRY.get(optional(url.searchParams, "source_id") ?? "moiat_industrial_licenses");
      const dataset = optional(url.searchParams, "dataset") ?? null;
      if (indicator === "dataset_stability") return json(envelope(stabilityIndicator(source, reliabilityStore().listSnapshots(source.id, dataset, 100))));
      const records = (await fetchResult(source, { dataset, query: optional(url.searchParams, "query"), limit: Math.max(1, integer(url.searchParams, "limit", 100, 1000)) })).records;
      return json(envelope(industrialDistributionIndicator(source, records)));
    }
    if (request.method === "GET" && path === "/api/v1/intelligence/recipes") return json(envelope(listRecipes()));
    const recipeMatch = path.match(/^\/api\/v1\/intelligence\/recipes\/([^/]+)$/);
    if (request.method === "GET" && recipeMatch) {
      const recipe = decodeURIComponent(recipeMatch[1]) as RecipeId;
      if (!RECIPE_IDS.includes(recipe)) throw new ValidationError(`recipe must be one of ${RECIPE_IDS.join(", ")}`);
      const sourceId = optional(url.searchParams, "source_id");
      const datasets = recipe === "dataset_freshness" && sourceId
        ? await listDatasets(REGISTRY.get(sourceId), { query: optional(url.searchParams, "query"), limit: Math.max(1, integer(url.searchParams, "limit", 100, 100)) })
        : undefined;
      const limit = Math.max(1, integer(url.searchParams, "limit", 100, 1000));
      const dataset = optional(url.searchParams, "dataset");
      const records = recipe === "emirate_comparison" && sourceId
        ? (await fetchResult(REGISTRY.get(sourceId), { dataset, query: optional(url.searchParams, "query"), limit })).records
        : undefined;
      const snapshots = recipe === "trend_analysis" && sourceId
        ? reliabilityStore().listSnapshots(sourceId, dataset ?? null, 100)
        : undefined;
      return json(envelope(runRecipe({
        recipe, sourceId, dataset, datasets, records, snapshots,
        fromSnapshot: integer(url.searchParams, "from_snapshot", 0, Number.MAX_SAFE_INTEGER) || undefined,
        toSnapshot: integer(url.searchParams, "to_snapshot", 0, Number.MAX_SAFE_INTEGER) || undefined,
      }, reliabilityStore())));
    }
    if (request.method === "GET" && path === "/api/v1/intelligence/market-snapshot") {
      return json(envelope(await buildMarketSnapshot(url.searchParams.get("topic") || "industry", Math.max(1, integer(url.searchParams, "limit", 100, 200)))));
    }

    if (request.method === "GET" && path === "/api/v1/snapshots/diff") {
      const from = integer(url.searchParams, "from", 0, Number.MAX_SAFE_INTEGER);
      const to = integer(url.searchParams, "to", 0, Number.MAX_SAFE_INTEGER);
      if (!from || !to) throw new ValidationError("from and to are required");
      return json(envelope(reliabilityStore().diffSnapshots(from, to)));
    }

    const snapshotMatch = path.match(/^\/api\/v1\/sources\/([^/]+)\/snapshots$/);
    if (snapshotMatch) {
      const source = REGISTRY.get(decodeURIComponent(snapshotMatch[1]));
      const dataset = optional(url.searchParams, "dataset") ?? null;
      if (request.method === "GET") return json(envelope(reliabilityStore().listSnapshots(source.id, dataset, Math.max(1, integer(url.searchParams, "limit", 20, 100)))));
      if (request.method === "POST") {
        requireWrite(request.headers.get("x-api-key"));
        const result = await fetchResult(source, { dataset, limit: Math.max(1, integer(url.searchParams, "limit", 100, 1000)) });
        return json(envelope(reliabilityStore().saveSnapshot(source.id, dataset, result.records), {
          citation: citation(source), fetched_at: result.fetched_at,
          lineage: [{ operation: "fetch", connector: source.kind }, { operation: "snapshot", version: VERSION }],
        }), 201);
      }
    }

    const tileJsonMatch = path.match(/^\/api\/v1\/sources\/([^/]+)\/tilejson$/);
    if (request.method === "GET" && tileJsonMatch) {
      const source = REGISTRY.get(decodeURIComponent(tileJsonMatch[1]));
      const dataset = optional(url.searchParams, "dataset");
      const suffix = dataset ? `?dataset=${encodeURIComponent(dataset)}` : "";
      return json({ tilejson: "3.0.0", name: source.name_en, attribution: citation(source), minzoom: 0, maxzoom: 22, vector_layers: [{ id: source.id, fields: {} }], tiles: [`${url.origin}/api/v1/sources/${encodeURIComponent(source.id)}/tiles/{z}/{x}/{y}.pbf${suffix}`] });
    }

    const tileMatch = path.match(/^\/api\/v1\/sources\/([^/]+)\/tiles\/(\d+)\/(\d+)\/(\d+)\.pbf$/);
    if (request.method === "GET" && tileMatch) {
      const source = REGISTRY.get(decodeURIComponent(tileMatch[1]));
      const z = Number(tileMatch[2]); const x = Number(tileMatch[3]); const y = Number(tileMatch[4]);
      const dataset = optional(url.searchParams, "dataset");
      const result = await fetchResult(source, { dataset, query: optional(url.searchParams, "query"), limit: Math.max(1, integer(url.searchParams, "limit", 1000, 1000)) });
      const bytes = encodeVectorTile(geo.toGeoJson(result.records, source, dataset ?? null), z, x, y, source.id);
      const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      return new Response(body, { headers: {
        "content-type": "application/vnd.mapbox-vector-tile", "cache-control": "public, max-age=60",
        "x-uaemcp-source": source.id, "x-uaemcp-citation": encodeURIComponent(citation(source)),
      } });
    }

    const match = path.match(/^\/api\/v1\/sources\/([^/]+)(?:\/(health|health-history|datasets|records|schema|geo|aggregate|export))?$/);
    if (!match || request.method !== "GET") return null;
    const source = REGISTRY.get(decodeURIComponent(match[1]));
    const action = match[2];
    if (!action) return json(envelope(source));
    if (action === "health") {
      const health = await checkHealth(source);
      reliabilityStore().recordHealth(health);
      return json(envelope(health));
    }
    if (action === "health-history") return json(envelope(reliabilityStore().healthHistory(source.id, Math.max(1, integer(url.searchParams, "limit", 100, 1000)))));

    const query = optional(url.searchParams, "query");
    const dataset = optional(url.searchParams, "dataset");
    const offset = integer(url.searchParams, "offset", 0, Number.MAX_SAFE_INTEGER);
    if (action === "datasets") {
      const limit = Math.max(1, integer(url.searchParams, "limit", 50, 100));
      const data = (await listDatasets(source, { query, limit, offset })).map((dataset) => datasetModel(dataset, source));
      return json(envelope(data, { source_id: source.id, kind: source.kind, citation: citation(source), count: data.length, limit, offset }));
    }

    const defaultLimit = action === "records" ? 10 : action === "schema" ? 50 : 500;
    const maximumLimit = action === "records" || action === "schema" ? 100 : 1000;
    const limit = Math.max(1, integer(url.searchParams, "limit", defaultLimit, maximumLimit));
    const result = await fetchResult(source, { query, dataset, limit, offset });
    if (action === "records") return json(envelope(result.records, { ...metaOf(result), limit, offset }));
    if (action === "schema") return json(envelope(inferSchema(result.records), {
      source_id: source.id,
      dataset: dataset ?? null,
      citation: citation(source),
      fetched_at: result.fetched_at,
      lineage: [{ operation: "fetch_sample", connector: source.kind }, { operation: "infer_schema", version: VERSION }],
    }));
    if (action === "geo") {
      const bbox = optional(url.searchParams, "bbox");
      const near = optional(url.searchParams, "near");
      const polygon = optional(url.searchParams, "polygon");
      const nearest = optional(url.searchParams, "nearest");
      const filtered = geo.filterRecords(result.records, source, { bbox: bbox ? geo.parseBbox(bbox) : undefined, near: near ? geo.parseNear(near) : undefined, polygon: polygon ? geo.parsePolygon(polygon) : undefined });
      const ranked = nearest ? geo.nearestRecords(filtered, source, geo.parseLatLon(nearest), Math.max(1, integer(url.searchParams, "top", 10, 100))) : filtered;
      return json(envelope(geo.toGeoJson(ranked, source, dataset ?? null), { source_id: source.id, citation: citation(source), scanned: result.records.length, matched: ranked.length, lineage: [{ operation: "fetch", connector: source.kind }, { operation: "spatial_filter", bbox: Boolean(bbox), near: Boolean(near), polygon: Boolean(polygon) }, ...(nearest ? [{ operation: "nearest_rank", point: nearest }] : []), { operation: "geojson" }] }));
    }
    if (action === "aggregate") {
      const fields = (url.searchParams.get("group_by") || "").split(",").map((field) => field.trim()).filter(Boolean);
      if (!fields.length) throw new ValidationError("group_by is required");
      const metric = (url.searchParams.get("metric") || "count") as Metric;
      const groups = aggregate(result.records, { group_by: fields, metric, value_field: optional(url.searchParams, "value_field"), top: Math.max(1, integer(url.searchParams, "top", 20, 200)) });
      return json(envelope(groups, { source_id: source.id, group_by: fields, metric, sample_size: result.records.length, citation: citation(source), lineage: [{ operation: "fetch", connector: source.kind }, { operation: "aggregate", group_by: fields, metric }] }));
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
    if (!(error instanceof UaemcpError) && error instanceof Error && /metric must|requires a value_field|bbox|near|polygon|point|join radius|tile coordinates|vector tile/.test(error.message)) return failure(new ValidationError(error.message));
    return failure(error);
  }
}
