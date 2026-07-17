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
import { buildPlaceNamesProduct } from "./places.js";
import { buildTaxServiceReport } from "./tax-services.js";
import { taxServicesPage } from "./tax-services-web.js";
import { buildTaxArchive, loadTaxArchiveViews, TAX_ARCHIVE_SPECS } from "./tax-archive.js";
import { taxArchivePage } from "./tax-archive-web.js";
import { loadTradeFlowProduct } from "./trade-flow-service.js";
import { tradeFlowPage } from "./trade-flow-web.js";
import { loadAjmanBusinessProduct } from "./ajman-business-service.js";
import { ajmanBusinessPage } from "./ajman-business-web.js";
import { loadAjmanUrbanProduct } from "./ajman-urban-service.js";
import { ajmanUrbanPage } from "./ajman-urban-web.js";
import { loadAjmanParksProduct } from "./ajman-parks-service.js";
import { ajmanParksPage } from "./ajman-parks-web.js";
import { listProducts } from "./products.js";
import { healthIndicatorsPage } from "./health-indicators-web.js";
import { loadHealthIndicators } from "./health-indicators-service.js";
import { healthFacilitiesPage } from "./health-facilities-web.js";
import { loadHealthFacilitiesAtlas } from "./health-facilities-service.js";
import { HEALTH_FACILITY_EMIRATES, HEALTH_FACILITY_SECTORS, HEALTH_FACILITY_YEARS } from "./health-facilities.js";
import { buildEducationLedger } from "./education-ledger.js";
import { educationLedgerPage } from "./education-ledger-web.js";
import { assessGoldenResidencyReadiness, goldenResidencyCatalogue, GOLDEN_PATHWAY_IDS, type GoldenReadinessInput } from "./golden-residency.js";
import { goldenResidencyPage } from "./golden-residency-web.js";
import { BUSINESS_ACTIVITY_SECTORS, BUSINESS_EMIRATES, BUSINESS_SETUP_TYPES, businessSetupCatalogue, routeBusinessSetup, type BusinessSetupInput } from "./business-setup.js";
import { businessSetupPage } from "./business-setup-web.js";
import { STARTUP_EMIRATES, STARTUP_STAGES, STARTUP_SUPPORT_TYPES, matchStartupSupport, startupSupportCatalogue, type StartupSupportInput } from "./startup-support.js";
import { startupSupportPage } from "./startup-support-web.js";
import { buildFounderPathway, type FounderPathwayInput } from "./founder-pathway.js";
import { founderPathwayPage } from "./founder-pathway-web.js";
import { nationalBriefPage } from "./national-brief-web.js";
import { loadNationalEvidenceBrief } from "./national-brief-service.js";
import { evidenceStudioPage } from "./evidence-studio-web.js";
import { loadEvidenceDossier, type EvidenceDossierOptions } from "./evidence-dossier-service.js";
import { EVIDENCE_DOSSIER_TEMPLATES, EVIDENCE_PILLAR_IDS, type EvidencePillarId } from "./evidence-dossier.js";
import { policyWatchPage } from "./policy-watch-web.js";
import { POLICY_WATCH_SOURCE_IDS, checkPolicyEvidenceWatch, policyEvidenceStore, policyEvidenceWatchReport } from "./policy-watch-service.js";
import { policyWatchScheduler } from "./policy-watch-scheduler.js";
import type { RuntimeDependencies } from "./dependencies.js";
import { runtimeToolCatalog } from "./server.js";
import { toolExplorerPage } from "./tool-explorer-web.js";
import { CONNECTIVITY_SERIES_IDS, loadConnectivityPulse, type ConnectivitySeriesId } from "./connectivity-service.js";
import { connectivityPage } from "./connectivity-web.js";
import { loadHealthFacilitiesMap } from "./health-facilities-map-service.js";
import { loadAeronauticalPublications, type AeronauticalPublicationKind } from "./aeronautical-publications-service.js";
import { aeronauticalPublicationsPage } from "./aeronautical-publications-web.js";
import { healthFacilitiesMapPage } from "./health-facilities-map-web.js";
import { loadTourismPulse, type TourismMetric } from "./tourism-pulse.js";
import { tourismPulsePage } from "./tourism-pulse-web.js";

type Json = Record<string, unknown>;
const AERONAUTICAL_PUBLICATION_KINDS = ["airac_amendment", "supplement", "other"] as const;

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

function isoDate(params: URLSearchParams, key: string): string | undefined {
  const value = optional(params, key);
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new ValidationError(`${key} must use YYYY-MM-DD format`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new ValidationError(`${key} must be a valid calendar date`);
  return value;
}

const UAE_MAP_BOUNDS = { minLat: 22, maxLat: 27, minLon: 51, maxLon: 57 } as const;
function healthBbox(value: string | undefined): [number, number, number, number] | undefined {
  if (!value) return undefined;
  const numbers = value.split(",").map((part) => Number(part.trim()));
  if (numbers.length !== 4 || numbers.some((number) => !Number.isFinite(number))) throw new ValidationError("bbox must be min_lon,min_lat,max_lon,max_lat");
  const [minLon, minLat, maxLon, maxLat] = numbers;
  if (minLon < UAE_MAP_BOUNDS.minLon || maxLon > UAE_MAP_BOUNDS.maxLon || minLat < UAE_MAP_BOUNDS.minLat || maxLat > UAE_MAP_BOUNDS.maxLat) throw new ValidationError("bbox must stay within UAE map bounds");
  if (minLon > maxLon || minLat > maxLat) throw new ValidationError("bbox minimums must not exceed maximums");
  return [minLon, minLat, maxLon, maxLat];
}
function healthNear(value: string | undefined): [number, number, number] | undefined {
  if (!value) return undefined;
  const numbers = value.split(",").map((part) => Number(part.trim()));
  if (numbers.length !== 3 || numbers.some((number) => !Number.isFinite(number))) throw new ValidationError("near must be lat,lon,radius_km");
  const [lat, lon, radius] = numbers;
  if (lat < UAE_MAP_BOUNDS.minLat || lat > UAE_MAP_BOUNDS.maxLat || lon < UAE_MAP_BOUNDS.minLon || lon > UAE_MAP_BOUNDS.maxLon) throw new ValidationError("near coordinates must stay within UAE map bounds");
  if (radius <= 0 || radius > 200) throw new ValidationError("near radius_km must be greater than 0 and at most 200");
  return [lat, lon, radius];
}

const REST_DEFAULTS: RuntimeDependencies = { fetchIndustryRecords: fetchResult, fetchTaxRecords: fetchResult, fetchHealthRecords: fetchResult };

const DUBAI_FONT_FILES = new Map([
  ["/assets/fonts/Dubai-Regular.woff", "https://dubaihumanitarian.ae/fonts/Dubai-Regular.woff"],
  ["/assets/fonts/Dubai-Bold.woff", "https://dubaihumanitarian.ae/fonts/Dubai-Bold.woff"],
]);

async function dubaiFont(path: string, method: "GET" | "HEAD"): Promise<Response | null> {
  const upstreamUrl = DUBAI_FONT_FILES.get(path);
  if (!upstreamUrl) return null;
  const upstream = await fetch(upstreamUrl, { method, signal: AbortSignal.timeout(8_000) });
  if (!upstream.ok) throw new UaemcpError(`Dubai Font upstream returned HTTP ${upstream.status}`);
  return new Response(method === "HEAD" ? null : upstream.body, {
    headers: {
      "content-type": "font/woff",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function handleRest(request: Request, dependencies: RuntimeDependencies = REST_DEFAULTS): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  try {
    if ((request.method === "GET" || request.method === "HEAD") && DUBAI_FONT_FILES.has(path)) return await dubaiFont(path, request.method);
    if (request.method === "GET" && path === "/") return new Response(landingPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/tools") return new Response(toolExplorerPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/connectivity") return new Response(connectivityPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/tourism-pulse") return new Response(tourismPulsePage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/aeronautical-publications") return new Response(aeronauticalPublicationsPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/observatory") return new Response(observatoryPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/industry-atlas") return new Response(industryAtlasPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/places") return new Response(placesExplorerPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/tax-services") return new Response(taxServicesPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/tax-services/archive") return new Response(taxArchivePage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/trade-flow") return new Response(tradeFlowPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/ajman-business") return new Response(ajmanBusinessPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/ajman-urban") return new Response(ajmanUrbanPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/ajman-parks") return new Response(ajmanParksPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/health-indicators") return new Response(healthIndicatorsPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/health-facilities") return new Response(healthFacilitiesPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/health-facilities-map") return new Response(healthFacilitiesMapPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/education") return new Response(educationLedgerPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/golden-residency") return new Response(goldenResidencyPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/business-setup") return new Response(businessSetupPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/startup-support") return new Response(startupSupportPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/founder-pathway") return new Response(founderPathwayPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/national-brief") return new Response(nationalBriefPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/evidence-studio") return new Response(evidenceStudioPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/policy-watch") return new Response(policyWatchPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; font-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
    if (request.method === "GET" && path === "/openapi.json") return json(openApiDocument(url.origin));
    if (request.method === "GET" && path === "/.well-known/uaemcp.json") return json(trustManifest());
    if (request.method === "GET" && path === "/api/v1/coverage") return json(envelope(coverageSummary()));
    if (request.method === "GET" && path === "/api/v1/tools") {
      const catalog = runtimeToolCatalog();
      return json(envelope(catalog, { total: catalog.summary.total, generated_from: catalog.generatedFrom }));
    }
    if (request.method === "GET" && path === "/api/v1/products") {
      const products = listProducts();
      return json(envelope(products, { total: products.length, published: products.filter((product) => product.status === "published").length }));
    }
    if (request.method === "GET" && path === "/api/v1/connectivity") {
      const series = optional(url.searchParams, "series");
      if (series && !CONNECTIVITY_SERIES_IDS.includes(series as ConnectivitySeriesId)) throw new ValidationError("series is invalid");
      const from = isoDate(url.searchParams, "from");
      const to = isoDate(url.searchParams, "to");
      if (from && to && from > to) throw new ValidationError("from must not be after to");
      const loaded = await loadConnectivityPulse(dependencies.fetchConnectivityRecords ?? fetchResult, { series: series as ConnectivitySeriesId | undefined, from, to });
      return json(envelope(loaded.data, { ...loaded.meta, filters: { series, from, to } }));
    }
    if (request.method === "GET" && path === "/api/v1/tourism-pulse") {
      const metric = optional(url.searchParams, "metric");
      const metrics = ["hotel_guest_arrivals", "guest_nights", "hotel_establishments", "hotel_rooms", "occupancy_rate"] as const;
      if (metric && !metrics.includes(metric as TourismMetric)) throw new ValidationError("metric is invalid");
      const parseYear = (name: string): number | undefined => {
        const raw = url.searchParams.get(name);
        if (raw === null) return undefined;
        if (!/^\d{4}$/.test(raw) || Number(raw) < 2014 || Number(raw) > 2025) throw new ValidationError(`${name} must be an integer from 2014 to 2025`);
        return Number(raw);
      };
      const fromYear = parseYear("from_year");
      const toYear = parseYear("to_year");
      if (fromYear && toYear && fromYear > toYear) throw new ValidationError("from_year must not be after to_year");
      const loaded = await loadTourismPulse({ fetcher: dependencies.fetchTourismWorkbook, metric: metric as TourismMetric | undefined, fromYear, toYear });
      return json(envelope(loaded.report, { ...loaded.meta, filters: { metric, from_year: fromYear, to_year: toYear }, units_kept_separate: true, causal_interpretation: false }));
    }
    if (request.method === "GET" && path === "/api/v1/health-facilities-map") {
      const q = optional(url.searchParams, "q")?.trim();
      if (q && (q.length < 2 || q.length > 100)) throw new ValidationError("q must contain 2-100 characters");
      const bboxRaw = optional(url.searchParams, "bbox");
      const nearRaw = optional(url.searchParams, "near");
      if (bboxRaw && nearRaw) throw new ValidationError("use bbox or near, not both");
      const rawLimit = url.searchParams.get("limit");
      if (rawLimit !== null && (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 200)) throw new ValidationError("limit must be an integer from 1 to 200");
      const limit = rawLimit === null ? 100 : Number(rawLimit);
      const loaded = await loadHealthFacilitiesMap(dependencies.fetchHealthFacilitiesMapRecords ?? fetchResult, { q, bbox: healthBbox(bboxRaw), near: healthNear(nearRaw), limit });
      return json(envelope(loaded.data, { ...loaded.meta, filters: { q, bbox: bboxRaw, near: nearRaw, limit }, privacy: "direct_contact_fields_redacted" }));
    }
    if (request.method === "GET" && path === "/api/v1/aeronautical-publications") {
      const kind = optional(url.searchParams, "kind");
      if (kind && !AERONAUTICAL_PUBLICATION_KINDS.includes(kind as AeronauticalPublicationKind)) throw new ValidationError("kind is invalid");
      const rawLimit = url.searchParams.get("limit");
      if (rawLimit !== null && (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 50)) throw new ValidationError("limit must be an integer from 1 to 50");
      const limit = rawLimit === null ? 25 : Number(rawLimit);
      const loaded = await loadAeronauticalPublications(dependencies.fetchAeronauticalPublicationsPage, { kind: kind as AeronauticalPublicationKind | undefined, limit });
      return json(envelope(loaded.data, { ...loaded.meta, filters: { kind, limit }, decision: "discovery_only", operational_use: false }));
    }
    if (request.method === "GET" && path === "/api/v1/policy-watch") {
      return json(envelope(policyEvidenceWatchReport(dependencies.policyEvidenceStore ?? policyEvidenceStore()), { hidden_upstream_work: false }));
    }
    if (request.method === "POST" && path === "/api/v1/policy-watch/check") {
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > 2_048) throw new ValidationError("request body is too large");
      const body = await request.json().catch(() => { throw new ValidationError("body must be valid JSON"); }) as Record<string, unknown>;
      if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "sourceIds")) throw new ValidationError("only sourceIds is accepted");
      if (!Array.isArray(body.sourceIds) || body.sourceIds.length < 1 || body.sourceIds.length > 5 || new Set(body.sourceIds).size !== body.sourceIds.length || body.sourceIds.some((id) => typeof id !== "string" || !POLICY_WATCH_SOURCE_IDS.includes(id as typeof POLICY_WATCH_SOURCE_IDS[number]))) throw new ValidationError("sourceIds must contain 1-5 unique allowlisted ids");
      const store = dependencies.policyEvidenceStore ?? policyEvidenceStore();
      const recent = body.sourceIds.every((id) => {
        const latest = store.observations(String(id), 1)[0];
        return latest && Date.now() - Date.parse(latest.checkedAt) < 300_000;
      });
      if (recent) return json(envelope(policyEvidenceWatchReport(store), { cached: true, stores_user_data: false, stores_page_evidence: true }));
      const report = await checkPolicyEvidenceWatch(body.sourceIds as string[], { getText: dependencies.fetchPolicyPage, store });
      return json(envelope(report, { cached: false, stores_user_data: false, stores_page_evidence: true }));
    }
    if (request.method === "POST" && path === "/api/v1/evidence-dossier") {
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > 4_096) throw new ValidationError("request body is too large");
      const body = await request.json().catch(() => { throw new ValidationError("body must be valid JSON"); }) as EvidenceDossierOptions & Record<string, unknown>;
      const allowed = new Set(["template", "question", "language", "pillars", "query", "emirate", "healthFacilitiesLimit", "healthIndicatorsLimit", "industryLimit"]);
      if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !allowed.has(key))) throw new ValidationError("only bounded, non-identifying evidence fields are accepted");
      if (typeof body.question !== "string" || body.question.trim().length < 1 || body.question.trim().length > 200) throw new ValidationError("question must contain 1-200 characters");
      if (!EVIDENCE_DOSSIER_TEMPLATES.includes(body.template as typeof EVIDENCE_DOSSIER_TEMPLATES[number])) throw new ValidationError("template is invalid");
      if (body.language !== "en" && body.language !== "ar") throw new ValidationError("language must be en or ar");
      if (!Array.isArray(body.pillars) || body.pillars.length < 2 || body.pillars.length > 5 || new Set(body.pillars).size !== body.pillars.length || body.pillars.some((id) => typeof id !== "string" || !EVIDENCE_PILLAR_IDS.includes(id as EvidencePillarId))) throw new ValidationError("pillars must contain 2-5 unique supported ids");
      if (body.query !== undefined && (typeof body.query !== "string" || body.query.trim().length > 100)) throw new ValidationError("query must contain at most 100 characters");
      if (body.emirate !== undefined && (typeof body.emirate !== "string" || !BUSINESS_EMIRATES.includes(body.emirate as typeof BUSINESS_EMIRATES[number]))) throw new ValidationError("emirate is invalid");
      for (const [key, maximum] of [["healthFacilitiesLimit", 200], ["healthIndicatorsLimit", 50], ["industryLimit", 100]] as const) {
        const value = body[key];
        if (value !== undefined && (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > maximum)) throw new ValidationError(`${key} must be an integer from 1 to ${maximum}`);
      }
      const result = await loadEvidenceDossier({ ...body, question: body.question.trim(), pillars: body.pillars as EvidencePillarId[] }, {
        fetchHealthFacilitiesRecords: dependencies.fetchHealthFacilitiesRecords,
        fetchHealthIndicatorsRecords: dependencies.fetchHealthRecords,
        fetchIndustryRecords: dependencies.fetchIndustryRecords,
        fetchTaxRecords: dependencies.fetchTaxRecords,
      });
      return json(envelope(result.data, { ...result.meta, stored: false }));
    }
    if (request.method === "GET" && path === "/api/v1/national-brief") {
      const positive = (key: string, fallback: number, max: number) => {
        const raw = url.searchParams.get(key);
        if (raw === null) return fallback;
        if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > max) throw new ValidationError(`${key} must be an integer from 1 to ${max}`);
        return Number(raw);
      };
      const query = url.searchParams.get("q")?.trim() || undefined;
      if (query && query.length > 100) throw new ValidationError("q must contain at most 100 characters");
      const emirate = url.searchParams.get("emirate")?.trim() || undefined;
      if (emirate && !BUSINESS_EMIRATES.includes(emirate as typeof BUSINESS_EMIRATES[number])) throw new ValidationError("emirate is invalid");
      const result = await loadNationalEvidenceBrief({ healthLimit: positive("health_limit", 12, 50), industryLimit: positive("industry_limit", 50, 100), emirate, query }, {
        fetchHealthRecords: dependencies.fetchHealthRecords,
        fetchIndustryRecords: dependencies.fetchIndustryRecords,
        fetchTaxRecords: dependencies.fetchTaxRecords,
      });
      return json(envelope(result.data, result.meta));
    }
    if (request.method === "GET" && path === "/api/v1/places") {
      const query = url.searchParams.get("q")?.trim() ?? "";
      if (query.length < 2 || query.length > 100) throw new ValidationError("q must contain 2-100 characters");
      const rawLimit = url.searchParams.get("limit");
      if (rawLimit !== null && (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 100)) throw new ValidationError("limit must be an integer from 1 to 100");
      const limit = rawLimit === null ? 20 : Number(rawLimit);
      const source = REGISTRY.get("fgic_national_gazetteer");
      const result = await (dependencies.fetchPlaceRecords ?? fetchResult)(source, { query, limit });
      return json(envelope(buildPlaceNamesProduct(result.records, { query, citation: result.citation, fetchedAt: result.fetched_at }), {
        ...metaOf(result), requested_limit: limit, returned_records: result.records.length,
      }));
    }
    if (request.method === "GET" && path === "/api/v1/golden-residency") {
      const catalogue = goldenResidencyCatalogue();
      return json(envelope(catalogue, { decision: "informational_only", verified_at: catalogue.verifiedAt, source_ids: ["icp_golden_residency"] }));
    }
    if (request.method === "GET" && path === "/api/v1/business-setup") return json(envelope(businessSetupCatalogue(), { decision: "routing_only", stored: false, verified_at: "2026-07-17" }));
    if (request.method === "POST" && path === "/api/v1/business-setup/route") {
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > 2_048) throw new ValidationError("request body is too large");
      const body = await request.json().catch(() => { throw new ValidationError("body must be valid JSON"); }) as BusinessSetupInput;
      if (!body || typeof body !== "object" || Object.keys(body).some((key) => !["emirate", "setupType", "activitySector"].includes(key))) throw new ValidationError("only non-identifying routing fields are accepted");
      if (!BUSINESS_EMIRATES.includes(body.emirate)) throw new ValidationError("emirate is invalid");
      if (!BUSINESS_SETUP_TYPES.includes(body.setupType)) throw new ValidationError("setupType is invalid");
      if (body.activitySector !== undefined && !BUSINESS_ACTIVITY_SECTORS.includes(body.activitySector)) throw new ValidationError("activitySector is invalid");
      return json(envelope(routeBusinessSetup(body), { decision: "routing_only", stored: false, verified_at: "2026-07-17" }));
    }
    if (request.method === "GET" && path === "/api/v1/startup-support") return json(envelope(startupSupportCatalogue(), { decision: "discovery_only", stored: false, verified_at: "2026-07-17" }));
    if (request.method === "POST" && path === "/api/v1/startup-support/match") {
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > 2_048) throw new ValidationError("request body is too large");
      const body = await request.json().catch(() => { throw new ValidationError("body must be valid JSON"); }) as StartupSupportInput;
      if (!body || typeof body !== "object" || Object.keys(body).some((key) => !["stage", "supportType", "emirate"].includes(key))) throw new ValidationError("only non-identifying discovery fields are accepted");
      if (!STARTUP_STAGES.includes(body.stage)) throw new ValidationError("stage is invalid");
      if (!STARTUP_SUPPORT_TYPES.includes(body.supportType)) throw new ValidationError("supportType is invalid");
      if (!STARTUP_EMIRATES.includes(body.emirate)) throw new ValidationError("emirate is invalid");
      return json(envelope(matchStartupSupport(body), { decision: "discovery_only", stored: false, verified_at: "2026-07-17" }));
    }
    if (request.method === "POST" && path === "/api/v1/founder-pathway") {
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > 2_048) throw new ValidationError("request body is too large");
      const body = await request.json().catch(() => { throw new ValidationError("body must be valid JSON"); }) as FounderPathwayInput;
      const allowedFields = ["stage", "emirate", "setupType", "supportType", "activitySector"];
      if (!body || typeof body !== "object" || Object.keys(body).some((key) => !allowedFields.includes(key))) throw new ValidationError("only non-identifying planning fields are accepted");
      if (!STARTUP_STAGES.includes(body.stage)) throw new ValidationError("stage is invalid");
      if (!BUSINESS_EMIRATES.includes(body.emirate)) throw new ValidationError("emirate is invalid");
      if (!BUSINESS_SETUP_TYPES.includes(body.setupType)) throw new ValidationError("setupType is invalid");
      if (!STARTUP_SUPPORT_TYPES.includes(body.supportType)) throw new ValidationError("supportType is invalid");
      if (body.activitySector !== undefined && !BUSINESS_ACTIVITY_SECTORS.includes(body.activitySector)) throw new ValidationError("activitySector is invalid");
      return json(envelope(buildFounderPathway(body), { decision: "planning_only", stored: false, verified_at: "2026-07-17" }));
    }
    if (request.method === "POST" && path === "/api/v1/golden-residency/assess") {
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > 8_192) throw new ValidationError("request body is too large");
      const body = await request.json().catch(() => { throw new ValidationError("body must be valid JSON"); }) as GoldenReadinessInput;
      const allowed = new Set<string>(GOLDEN_PATHWAY_IDS);
      if (!body || typeof body !== "object" || !allowed.has(body.pathway)) throw new ValidationError("pathway is invalid");
      const allowedFields = new Set(["pathway", "jurisdiction", "capitalAed", "propertyValueAed", "annualTaxAed", "projectValueAed", "innovativeProjectEvidence", "incubatorRecommendation", "gradePercent", "universityGpa", "graduatedWithinTwoYears", "ministryRecommendation", "universityRecommendation", "professionalRecommendation", "attestedDegree", "fiveYearsExperience", "employmentContract", "monthlySalaryAed", "validPassportEvidence", "humanitarianYears", "volunteerHours", "humanitarianSupportAed"]);
      if (Object.keys(body).some((key) => !allowedFields.has(key))) throw new ValidationError("only non-identifying readiness fields are accepted");
      if (body.jurisdiction !== undefined && !["federal", "dubai", "abu_dhabi"].includes(body.jurisdiction)) throw new ValidationError("jurisdiction is invalid");
      const numericFields = ["capitalAed", "propertyValueAed", "annualTaxAed", "projectValueAed", "gradePercent", "universityGpa", "monthlySalaryAed", "humanitarianYears", "volunteerHours", "humanitarianSupportAed"] as const;
      for (const field of numericFields) {
        const value = body[field];
        if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) throw new ValidationError(`${field} must be a non-negative finite number`);
      }
      const booleanFields = ["innovativeProjectEvidence", "incubatorRecommendation", "graduatedWithinTwoYears", "ministryRecommendation", "universityRecommendation", "professionalRecommendation", "attestedDegree", "fiveYearsExperience", "employmentContract", "validPassportEvidence"] as const;
      for (const field of booleanFields) {
        if (body[field] !== undefined && typeof body[field] !== "boolean") throw new ValidationError(`${field} must be a boolean`);
      }
      if (body.gradePercent !== undefined && body.gradePercent > 100) throw new ValidationError("gradePercent must not exceed 100");
      if (body.universityGpa !== undefined && body.universityGpa > 4) throw new ValidationError("universityGpa must not exceed 4");
      return json(envelope(assessGoldenResidencyReadiness(body), { decision: "informational_only", stored: false, verified_at: "2026-07-17" }));
    }
    if (request.method === "GET" && path === "/api/v1/health-indicators") {
      const limit = Math.max(1, integer(url.searchParams, "limit", 100, 200));
      const loaded = await loadHealthIndicators(dependencies.fetchHealthRecords ?? fetchResult, {
        query: optional(url.searchParams, "q"), limit,
      });
      return json(envelope(loaded.report, loaded.meta));
    }
    if (request.method === "GET" && path === "/api/v1/health-facilities") {
      const year = Number(url.searchParams.get("year") ?? 2024);
      if (!HEALTH_FACILITY_YEARS.includes(year as typeof HEALTH_FACILITY_YEARS[number])) throw new ValidationError("year must be an integer from 2015 to 2024");
      const emirate = optional(url.searchParams, "emirate");
      if (emirate && !HEALTH_FACILITY_EMIRATES.includes(emirate as typeof HEALTH_FACILITY_EMIRATES[number])) throw new ValidationError("emirate is invalid");
      const sector = optional(url.searchParams, "sector");
      if (sector && !HEALTH_FACILITY_SECTORS.includes(sector as typeof HEALTH_FACILITY_SECTORS[number])) throw new ValidationError("sector is invalid");
      const category = optional(url.searchParams, "category");
      const facilityType = optional(url.searchParams, "facility_type");
      const query = optional(url.searchParams, "q");
      for (const [key, value] of [["category", category], ["facility_type", facilityType], ["q", query]] as const) if (value && value.length > 100) throw new ValidationError(`${key} must contain at most 100 characters`);
      const rawLimit = url.searchParams.get("limit");
      if (rawLimit !== null && (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 200)) throw new ValidationError("limit must be an integer from 1 to 200");
      const rowLimit = rawLimit === null ? 100 : Number(rawLimit);
      const loaded = await loadHealthFacilitiesAtlas(dependencies.fetchHealthFacilitiesRecords ?? fetchResult, { year, emirate, sector: sector as "Government" | "Private" | undefined, category, facilityType, query, rowLimit });
      return json(envelope(loaded.data, loaded.meta));
    }
    if (request.method === "GET" && path === "/api/v1/education") {
      const ledger = buildEducationLedger();
      return json(envelope(ledger, {
        source_id: "fcsc_unified_uae_numbers_2025",
        citation: ledger.source.citation,
        catalogue_citation: ledger.source.catalogueCitation,
        fetched_at: ledger.source.retrievedAt,
        delivery: ledger.source.delivery,
        sha256: ledger.source.sha256,
      }));
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
    if (request.method === "GET" && path === "/api/v1/ajman-business") {
      const requestedLimit = integer(url.searchParams, "limit", 500, 1000);
      if (requestedLimit < 1) throw new ValidationError("limit must be at least 1");
      const query = optional(url.searchParams, "q");
      if (query && query.length > 100) throw new ValidationError("q must contain at most 100 characters");
      const product = await loadAjmanBusinessProduct(dependencies.fetchAjmanBusinessRecords ?? fetchResult, requestedLimit, query);
      return json(envelope(product.data, product.meta));
    }
    if (request.method === "GET" && path === "/api/v1/ajman-urban") {
      const requestedLimit = integer(url.searchParams, "limit", 100, 100);
      if (requestedLimit < 1) throw new ValidationError("limit must be at least 1");
      const product = await loadAjmanUrbanProduct(dependencies.fetchAjmanUrbanRecords ?? fetchResult, requestedLimit);
      return json(envelope(product.data, product.meta));
    }
    if (request.method === "GET" && path === "/api/v1/ajman-parks") {
      const product = await loadAjmanParksProduct(dependencies.fetchAjmanParksRecords ?? fetchResult);
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
    if (request.method === "GET" && path === "/api/v1/operations/policy-watch") return json(envelope(policyWatchScheduler.status()));
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
