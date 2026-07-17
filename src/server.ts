/**
 * The MCP server: focused tools + resources + prompt templates over the official SDK.
 *
 * Every data-returning tool wraps results in { ok, data, error, meta } with full
 * provenance. Read tools are open; the write tool requires a token.
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { aggregate, type Metric } from "./aggregate.js";
import { requireWrite } from "./auth.js";
import { checkHealth, connectorKinds, fetchResult, listDatasets, metaOf } from "./connectors.js";
import { buildDashboardSummary } from "./dashboard.js";
import { UaemcpError, ValidationError } from "./errors.js";
import * as geo from "./geo.js";
import { buildSearch } from "./search.js";
import { buildMarketSnapshot } from "./snapshot.js";
import { citation, REGISTRY, type CustomSourceInput } from "./sources.js";
import { inferSchema } from "./schema.js";
import { capabilitiesFor, coverageSummary, datasetModel, portalModel } from "./catalog.js";
import { SERVER_NAME, VERSION } from "./version.js";
import { reliabilityStore } from "./reliability.js";
import { listRecipes, runRecipe } from "./intelligence.js";
import { snapshotScheduler } from "./scheduler.js";
import { resolveEntities } from "./entity-resolution.js";
import { coverageIndicator, healthIndicator, industrialDistributionIndicator, listIndicators, stabilityIndicator } from "./indicators.js";

type Json = Record<string, unknown>;

function ok(data: unknown, meta: Json = {}): Json {
  return { ok: true, data, error: null, meta };
}
function fail(err: unknown): Json {
  const code = err instanceof UaemcpError ? err.code : "error";
  const message = err instanceof Error ? err.message : String(err);
  return { ok: false, data: null, error: { code, message }, meta: {} };
}
function text(payload: Json) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

export function buildServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: VERSION });

  server.registerTool(
    "uae_indicator",
    {
      description: "List or calculate a methodology-backed UAE data indicator with evidence, limitations and citations.",
      inputSchema: { indicator: z.enum(["open_data_coverage", "api_health_score", "dataset_stability", "industrial_distribution"]).optional(), source_id: z.string().optional(), dataset: z.string().optional(), query: z.string().optional(), limit: z.number().int().min(1).max(1000).default(100) },
    },
    async ({ indicator, source_id, dataset, query, limit }) => {
      try {
        if (!indicator) return text(ok(listIndicators()));
        if (indicator === "open_data_coverage") return text(ok(coverageIndicator()));
        if (indicator === "api_health_score") return text(ok(healthIndicator(reliabilityStore())));
        const source = REGISTRY.get(source_id ?? "moiat_industrial_licenses");
        if (indicator === "dataset_stability") return text(ok(stabilityIndicator(source, reliabilityStore().listSnapshots(source.id, dataset ?? null, 100))));
        const records = (await fetchResult(source, { dataset, query, limit })).records;
        return text(ok(industrialDistributionIndicator(source, records)));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_entity_resolve",
    {
      description: "Resolve matching entities across two bounded source samples using explicit bilingual-normalized exact field mappings.",
      inputSchema: {
        left_source: z.string(), right_source: z.string(), left_fields: z.array(z.string()).min(1), right_fields: z.array(z.string()).min(1),
        left_dataset: z.string().optional(), right_dataset: z.string().optional(), limit: z.number().int().min(1).max(200).default(100), max_matches: z.number().int().min(1).max(5000).default(500),
      },
    },
    async ({ left_source, right_source, left_fields, right_fields, left_dataset, right_dataset, limit, max_matches }) => {
      try {
        const leftSource = REGISTRY.get(left_source); const rightSource = REGISTRY.get(right_source);
        const [left, right] = await Promise.all([fetchResult(leftSource, { dataset: left_dataset, limit }), fetchResult(rightSource, { dataset: right_dataset, limit })]);
        const resolved = resolveEntities(left.records, left_fields, right.records, right_fields, max_matches);
        return text(ok(resolved, { citations: [citation(leftSource), citation(rightSource)], lineage: [{ operation: "fetch_pair" }, { operation: "bilingual_normalized_exact_resolution", left_fields, right_fields }] }));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_spatial_join",
    {
      description: "Join point records from two official sources when they fall within radius_km. Both samples and output are strictly bounded.",
      inputSchema: {
        left_source: z.string(), right_source: z.string(), left_dataset: z.string().optional(), right_dataset: z.string().optional(),
        radius_km: z.number().positive().max(500).default(1), limit: z.number().int().min(1).max(200).default(100),
        max_matches: z.number().int().min(1).max(2000).default(500),
      },
    },
    async ({ left_source, right_source, left_dataset, right_dataset, radius_km, limit, max_matches }) => {
      try {
        const leftSource = REGISTRY.get(left_source); const rightSource = REGISTRY.get(right_source);
        const [left, right] = await Promise.all([
          fetchResult(leftSource, { dataset: left_dataset, limit }), fetchResult(rightSource, { dataset: right_dataset, limit }),
        ]);
        const matches = geo.spatialJoin(left.records, leftSource, right.records, rightSource, radius_km, max_matches);
        return text(ok(matches, {
          left_source, right_source, radius_km, left_scanned: left.records.length, right_scanned: right.records.length,
          matches: matches.length, citations: [citation(leftSource), citation(rightSource)],
          lineage: [{ operation: "fetch_pair", connectors: [leftSource.kind, rightSource.kind] }, { operation: "point_radius_spatial_join", radius_km }],
        }));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_source_add",
    {
      description: "[WRITE — requires token] Register a custom source using a built-in or installed connector plugin.",
      inputSchema: {
        id: z.string(), name_en: z.string(), name_ar: z.string(), owner: z.string(), base_url: z.string(),
        kind: z.string().default("metadata"), endpoint: z.string().optional(), docs_url: z.string().optional(),
        category: z.string().optional(), license: z.string().optional(), notes: z.string().optional(),
        row_path: z.array(z.string()).optional(), default_params: z.record(z.unknown()).optional(),
        connector_config: z.record(z.unknown()).optional(), max_page_size: z.number().int().positive().optional(),
        token: z.string().optional(),
      },
    },
    async ({ token, ...data }) => {
      try {
        requireWrite(token);
        if (!connectorKinds().includes(data.kind)) throw new ValidationError(`connector is not installed: ${data.kind}`);
        return text(ok(REGISTRY.addSource(data as CustomSourceInput)));
      }
      catch (e) { return text(fail(e)); }
    },
  );

  server.registerTool(
    "uae_sources_list",
    { description: "List every registered official UAE open-data source with its metadata." },
    async () => text(ok(REGISTRY.list(), { total: REGISTRY.list().length })),
  );

  server.registerTool(
    "uae_source_get",
    { description: "Get the full metadata for one source by id.", inputSchema: { source_id: z.string() } },
    async ({ source_id }) => {
      try {
        return text(ok(REGISTRY.get(source_id)));
      } catch (e) {
        return text(fail(e));
      }
    },
  );

  server.registerTool(
    "uae_source_health",
    { description: "Run a live, timeout-bounded health probe for one source.", inputSchema: { source_id: z.string() } },
    async ({ source_id }) => {
      try {
        const s = REGISTRY.get(source_id);
        const health = await checkHealth(s);
        reliabilityStore().recordHealth(health);
        return text(ok(health, { citation: citation(s) }));
      } catch (e) {
        return text(fail(e));
      }
    },
  );

  server.registerTool(
    "uae_observatory",
    {
      description: "Read the UAE Open Data Observatory: national reliability report, derived incidents, or one source reliability profile. Uses stored observations and never triggers hidden upstream work.",
      inputSchema: {
        action: z.enum(["report", "incidents", "source"]).default("report"),
        source_id: z.string().optional(),
        limit: z.number().int().min(1).max(1000).default(100),
      },
    },
    async ({ action, source_id, limit }) => {
      try {
        const store = reliabilityStore();
        if (action === "report") return text(ok(store.observatoryReport(REGISTRY.list().map((source) => source.id))));
        if (action === "incidents") return text(ok(store.incidents(source_id, limit), { limit, source_id: source_id ?? null }));
        if (!source_id) throw new ValidationError("source_id is required for action=source");
        const source = REGISTRY.get(source_id);
        return text(ok({ source, reliability: store.healthHistory(source.id, limit), incidents: store.incidents(source.id, limit), citation: citation(source) }));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_intelligence_recipe",
    {
      description: "Run an evidence-backed analytical recipe. Results include methodology, evidence, limitations and citations.",
      inputSchema: {
        recipe: z.enum(["source_coverage", "dataset_freshness", "historical_comparison", "emirate_comparison", "trend_analysis"]),
        source_id: z.string().optional(), dataset: z.string().optional(), query: z.string().optional(),
        limit: z.number().int().min(1).max(1000).default(100),
        from_snapshot: z.number().int().positive().optional(), to_snapshot: z.number().int().positive().optional(),
      },
    },
    async ({ recipe, source_id, dataset, query, limit, from_snapshot, to_snapshot }) => {
      try {
        const datasets = recipe === "dataset_freshness" && source_id ? await listDatasets(REGISTRY.get(source_id), { query, limit }) : undefined;
        const records = recipe === "emirate_comparison" && source_id ? (await fetchResult(REGISTRY.get(source_id), { dataset, query, limit })).records : undefined;
        const snapshots = recipe === "trend_analysis" && source_id ? reliabilityStore().listSnapshots(source_id, dataset ?? null, 100) : undefined;
        return text(ok(runRecipe({ recipe, sourceId: source_id, dataset, datasets, records, snapshots, fromSnapshot: from_snapshot, toSnapshot: to_snapshot }, reliabilityStore())));
      } catch (e) { return text(fail(e)); }
    },
  );

  server.registerTool(
    "uae_dataset_snapshot",
    {
      description: "Create, list, or diff historical dataset snapshots. create is a protected write action; list and diff are open reads.",
      inputSchema: {
        action: z.enum(["create", "list", "diff"]),
        source_id: z.string().optional(),
        dataset: z.string().optional(),
        limit: z.number().int().min(1).max(1000).default(100),
        from_snapshot: z.number().int().positive().optional(),
        to_snapshot: z.number().int().positive().optional(),
        token: z.string().optional(),
      },
    },
    async ({ action, source_id, dataset, limit, from_snapshot, to_snapshot, token }) => {
      try {
        const store = reliabilityStore();
        if (action === "diff") {
          if (!from_snapshot || !to_snapshot) throw new ValidationError("from_snapshot and to_snapshot are required");
          return text(ok(store.diffSnapshots(from_snapshot, to_snapshot)));
        }
        if (!source_id) throw new ValidationError("source_id is required");
        const source = REGISTRY.get(source_id);
        if (action === "list") return text(ok(store.listSnapshots(source.id, dataset ?? null, Math.min(limit, 100))));
        requireWrite(token);
        const result = await fetchResult(source, { dataset, limit });
        return text(ok(store.saveSnapshot(source.id, dataset ?? null, result.records), {
          citation: citation(source),
          fetched_at: result.fetched_at,
          lineage: [{ operation: "fetch", connector: source.kind }, { operation: "snapshot", version: VERSION }],
        }));
      } catch (e) {
        return text(fail(e));
      }
    },
  );

  server.registerTool(
    "uae_source_datasets",
    {
      description: "List the datasets inside a multi-dataset portal (CKAN/OpenDataSoft/ArcGIS). Use a returned id as `dataset` for uae_source_records.",
      inputSchema: { source_id: z.string(), query: z.string().optional(), limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).default(0) },
    },
    async ({ source_id, query, limit, offset }) => {
      try {
        const s = REGISTRY.get(source_id);
        const datasets = (await listDatasets(s, { query, limit, offset })).map((dataset) => datasetModel(dataset, s));
        return text(ok(datasets, { source_id: s.id, kind: s.kind, count: datasets.length }));
      } catch (e) {
        return text(fail(e));
      }
    },
  );

  server.registerTool(
    "uae_source_records",
    {
      description: "Fetch up to `limit` live, redacted, source-cited records. For multi-dataset portals pass `dataset` (from uae_source_datasets). Response meta carries provenance + a data-quality block.",
      inputSchema: { source_id: z.string(), query: z.string().optional(), limit: z.number().int().min(1).max(100).default(10), dataset: z.string().optional(), offset: z.number().int().min(0).default(0) },
    },
    async ({ source_id, query, limit, dataset, offset }) => {
      try {
        const s = REGISTRY.get(source_id);
        const r = await fetchResult(s, { dataset, query, limit, offset });
        return text(ok(r.records, metaOf(r)));
      } catch (e) {
        return text(fail(e));
      }
    },
  );

  server.registerTool(
    "uae_dataset_schema",
    {
      description: "Inspect a live dataset schema before filtering or aggregation. Returns inferred types, examples, semantic meaning, nullability, uniqueness and sample statistics.",
      inputSchema: { source_id: z.string(), dataset: z.string().optional(), sample_size: z.number().int().min(1).max(100).default(50) },
    },
    async ({ source_id, dataset, sample_size }) => {
      try {
        const source = REGISTRY.get(source_id);
        const result = await fetchResult(source, { dataset, limit: sample_size });
        return text(ok(inferSchema(result.records), {
          source_id: source.id,
          dataset: dataset ?? null,
          citation: citation(source),
          fetched_at: result.fetched_at,
          capabilities: capabilitiesFor(source),
          lineage: [{ operation: "fetch_sample", connector: source.kind }, { operation: "infer_schema", version: VERSION }],
        }));
      } catch (e) {
        return text(fail(e));
      }
    },
  );

  server.registerTool(
    "uae_search",
    {
      description: "Federated bilingual (ar/en) search across the catalog. With deep=true it also searches each portal's live dataset catalogue.",
      inputSchema: { query: z.string(), limit: z.number().int().min(1).max(100).default(20), deep: z.boolean().default(false) },
    },
    async ({ query, limit, deep }) => {
      try {
        return text(ok(await buildSearch(query, { limit, deep })));
      } catch (e) {
        return text(fail(e));
      }
    },
  );

  server.registerTool(
    "uae_source_geo",
    {
      description: "Spatially-filtered records as GeoJSON — powers map apps. bbox='min_lon,min_lat,max_lon,max_lat'; near='lat,lon,radius_km'.",
      inputSchema: { source_id: z.string(), dataset: z.string().optional(), bbox: z.string().optional(), near: z.string().optional(), polygon: z.string().optional(), nearest: z.string().optional(), top: z.number().int().min(1).max(100).default(10), query: z.string().optional(), limit: z.number().int().min(1).max(1000).default(500) },
    },
    async ({ source_id, dataset, bbox, near, polygon, nearest, top, query, limit }) => {
      try {
        const s = REGISTRY.get(source_id);
        const bb = bbox ? geo.parseBbox(bbox) : undefined;
        const nr = near ? geo.parseNear(near) : undefined;
        const pg = polygon ? geo.parsePolygon(polygon) : undefined;
        const r = await fetchResult(s, { dataset, query, limit });
        const filtered = geo.filterRecords(r.records, s, { bbox: bb, near: nr, polygon: pg });
        const ranked = nearest ? geo.nearestRecords(filtered, s, geo.parseLatLon(nearest), top) : filtered;
        return text(ok(geo.toGeoJson(ranked, s, dataset ?? null), { source_id: s.id, citation: citation(s), scanned: r.records.length, matched: ranked.length, lineage: [{ operation: "fetch", connector: s.kind }, { operation: "spatial_filter", bbox: Boolean(bb), near: Boolean(nr), polygon: Boolean(pg) }, ...(nearest ? [{ operation: "nearest_rank", point: nearest }] : []), { operation: "geojson" }] }));
      } catch (e) {
        return text(fail(e));
      }
    },
  );

  server.registerTool(
    "uae_source_aggregate",
    {
      description: "Group records and reduce with count|sum|avg|min|max. group_by is a comma-separated list of fields (dotted paths allowed). A generalized uae_market_snapshot.",
      inputSchema: { source_id: z.string(), group_by: z.string(), metric: z.enum(["count", "sum", "avg", "min", "max"]).default("count"), value_field: z.string().optional(), dataset: z.string().optional(), query: z.string().optional(), limit: z.number().int().min(1).max(1000).default(500), top: z.number().int().min(1).max(200).default(20) },
    },
    async ({ source_id, group_by, metric, value_field, dataset, query, limit, top }) => {
      try {
        const s = REGISTRY.get(source_id);
        const fields = group_by.split(",").map((f) => f.trim()).filter(Boolean);
        const r = await fetchResult(s, { dataset, query, limit });
        const groups = aggregate(r.records, { group_by: fields, metric: metric as Metric, value_field, top });
        return text(ok(groups, { source_id: s.id, group_by: fields, metric, sample_size: r.records.length, citation: citation(s), lineage: [{ operation: "fetch", connector: s.kind }, { operation: "aggregate", group_by: fields, metric }] }));
      } catch (e) {
        return text(fail(e));
      }
    },
  );

  server.registerTool(
    "uae_market_snapshot",
    { description: "Build a source-backed market snapshot (counts by emirate/area/product).", inputSchema: { topic: z.string().default("industry"), limit: z.number().int().min(1).max(200).default(100) } },
    async ({ topic, limit }) => {
      try {
        return text(ok(await buildMarketSnapshot(topic, limit)));
      } catch (e) {
        return text(fail(e));
      }
    },
  );

  server.registerTool(
    "uae_dashboard_summary",
    { description: "Concurrent, cached health snapshot across all sources (fast, never stalls)." },
    async () => {
      try {
        return text(ok(await buildDashboardSummary({ recordHistory: true })));
      } catch (e) {
        return text(fail(e));
      }
    },
  );

  server.registerTool(
    "uae_source_add_metadata",
    {
      description: "[WRITE — requires token] Add a metadata-only source to the local registry.",
      inputSchema: { id: z.string(), name_en: z.string(), name_ar: z.string(), owner: z.string(), base_url: z.string(), docs_url: z.string().optional(), category: z.string().optional(), notes: z.string().optional(), token: z.string().optional() },
    },
    async ({ token, ...data }) => {
      try {
        requireWrite(token);
        return text(ok(REGISTRY.addMetadataSource(data as Record<string, string>)));
      } catch (e) {
        return text(fail(e));
      }
    },
  );

  registerResources(server);
  registerPrompts(server);
  return server;
}

// ── MCP resources: the catalog + each source/dataset as addressable context ──
function registerResources(server: McpServer): void {
  const json = (payload: unknown): string => JSON.stringify(payload, null, 2);

  server.registerResource(
    "open_data_observatory",
    "uae://observatory",
    { title: "UAE Open Data Observatory", description: "Stored source reliability, uptime and incident evidence without live fan-out.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: json(reliabilityStore().observatoryReport(REGISTRY.list().map((source) => source.id))) }] }),
  );

  server.registerResource(
    "snapshot_scheduler_status",
    "uae://operations/snapshot-scheduler",
    { title: "Snapshot scheduler status", description: "Current schedule, targets, retention and latest run results.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: json(snapshotScheduler.status()) }] }),
  );

  server.registerResource(
    "intelligence_recipes",
    "uae://intelligence/recipes",
    { title: "UAE intelligence recipes", description: "Evidence-backed analytical recipes and their requirements.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: json({ recipes: listRecipes() }) }] }),
  );

  server.registerResource(
    "catalog_summary",
    "uae://catalog",
    { title: "UAE unified open-data catalog", description: "Explicit portal models, capabilities, licensing status and conservative coverage.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: json({ coverage: coverageSummary(), portals: REGISTRY.list().map(portalModel) }) }] }),
  );

  server.registerResource(
    "sources_catalog",
    "uae://sources",
    { title: "UAE open-data source catalog", description: "Every registered official UAE open-data source.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: json({ total: REGISTRY.list().length, sources: REGISTRY.list() }) }] }),
  );

  server.registerResource(
    "source_meta",
    new ResourceTemplate("uae://source/{source_id}", { list: undefined }),
    { title: "UAE source metadata", description: "Full metadata for one source by id.", mimeType: "application/json" },
    async (uri, { source_id }) => {
      try {
        return { contents: [{ uri: uri.href, mimeType: "application/json", text: json(REGISTRY.get(String(source_id))) }] };
      } catch (e) {
        return { contents: [{ uri: uri.href, mimeType: "application/json", text: json({ error: e instanceof Error ? e.message : String(e) }) }] };
      }
    },
  );

  server.registerResource(
    "source_datasets",
    new ResourceTemplate("uae://source/{source_id}/datasets", { list: undefined }),
    { title: "UAE source datasets", description: "Live dataset listing for a multi-dataset portal.", mimeType: "application/json" },
    async (uri, { source_id }) => {
      try {
        const s = REGISTRY.get(String(source_id));
        const refs = await listDatasets(s, { limit: 100 });
        return { contents: [{ uri: uri.href, mimeType: "application/json", text: json({ source_id: s.id, kind: s.kind, citation: citation(s), datasets: refs }) }] };
      } catch (e) {
        return { contents: [{ uri: uri.href, mimeType: "application/json", text: json({ error: e instanceof Error ? e.message : String(e) }) }] };
      }
    },
  );
}

// ── reusable prompt templates ────────────────────────────────────────────────
function registerPrompts(server: McpServer): void {
  const msg = (t: string) => ({ messages: [{ role: "user" as const, content: { type: "text" as const, text: t } }] });

  server.registerPrompt(
    "profile_sector",
    { title: "Profile a sector", description: "Profile an economic sector across the UAE from official data.", argsSchema: { sector: z.string().default("industry") } },
    ({ sector }) =>
      msg(
        `Profile the '${sector}' sector in the UAE using ONLY this server's official sources.\n1. uae_search query='${sector}' to find relevant sources/datasets.\n2. For the best source, uae_source_records (pick a dataset via uae_source_datasets if it is a multi-dataset portal).\n3. uae_source_aggregate to break it down by emirate and sub-category.\n4. If records carry coordinates, uae_source_geo to map them.\nCite every figure with source_id + citation + fetched_at from meta. Never invent numbers.`,
      ),
  );

  server.registerPrompt(
    "compare_emirates",
    { title: "Compare emirates", description: "Compare the emirates on a chosen indicator.", argsSchema: { indicator: z.string().default("industrial licenses") } },
    ({ indicator }) =>
      msg(
        `Compare the UAE emirates on '${indicator}' using official data only.\n1. uae_search query='${indicator}' to locate a source with per-emirate data.\n2. uae_source_aggregate with group_by set to the emirate field and an appropriate metric.\n3. Present a ranked table (emirate -> value) and note sample size + data_quality.confidence.\nAttribute to source_id + citation. State coverage caveats.`,
      ),
  );

  server.registerPrompt(
    "discover_datasets",
    { title: "Discover datasets", description: "Find official datasets on a topic across all portals.", argsSchema: { topic: z.string() } },
    ({ topic }) =>
      msg(
        `Find official UAE datasets about '${topic}'.\n1. uae_search query='${topic}' deep=true to search source catalogs AND live portal datasets.\n2. Summarise top matches: source_id, dataset id, title (en/ar), record count, has_geo.\n3. Recommend which to pull first and the exact tool call.\nOnly list datasets that actually exist in the results.`,
      ),
  );
}
