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
import { buildIndustryAtlas } from "./industry-atlas.js";
import { buildIndustrialChangeReport } from "./industry-change.js";
import { buildTaxServiceReport } from "./tax-services.js";
import { buildTaxArchive, loadTaxArchiveViews, TAX_ARCHIVE_SPECS } from "./tax-archive.js";
import { loadTradeFlowProduct } from "./trade-flow-service.js";
import { loadAjmanBusinessProduct } from "./ajman-business-service.js";
import { loadAjmanUrbanProduct } from "./ajman-urban-service.js";
import { loadAjmanParksProduct } from "./ajman-parks-service.js";
import { listProducts } from "./products.js";
import { loadHealthIndicators } from "./health-indicators-service.js";
import { loadHealthFacilitiesAtlas } from "./health-facilities-service.js";
import { HEALTH_FACILITY_EMIRATES, HEALTH_FACILITY_SECTORS, HEALTH_FACILITY_YEARS } from "./health-facilities.js";
import { buildEducationLedger } from "./education-ledger.js";
import { assessGoldenResidencyReadiness, goldenResidencyCatalogue, GOLDEN_PATHWAY_IDS } from "./golden-residency.js";
import { BUSINESS_ACTIVITY_SECTORS, BUSINESS_EMIRATES, BUSINESS_SETUP_TYPES, businessSetupCatalogue, routeBusinessSetup } from "./business-setup.js";
import { STARTUP_EMIRATES, STARTUP_STAGES, STARTUP_SUPPORT_TYPES, matchStartupSupport, startupSupportCatalogue } from "./startup-support.js";
import { buildFounderPathway } from "./founder-pathway.js";
import { buildPlaceNamesProduct } from "./places.js";
import { loadNationalEvidenceBrief } from "./national-brief-service.js";
import { loadEvidenceDossier } from "./evidence-dossier-service.js";
import { EVIDENCE_DOSSIER_TEMPLATES, EVIDENCE_PILLAR_IDS } from "./evidence-dossier.js";
import { POLICY_WATCH_SOURCE_IDS, checkPolicyEvidenceWatch, policyEvidenceStore, policyEvidenceWatchReport } from "./policy-watch-service.js";
import type { RuntimeDependencies } from "./dependencies.js";
import { createToolCatalog } from "./tool-catalog.js";

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

export function buildServer(dependencies: RuntimeDependencies = {}): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: VERSION });

  server.registerTool(
    "uae_place_names",
    {
      description: "Search the official FGIC National Gazetteer for bilingual UAE place names and coordinates. Returns a bounded, normalized, source-cited evidence product; points are not an authoritative boundary reference.",
      inputSchema: { query: z.string().trim().min(2).max(100), limit: z.number().int().min(1).max(100).default(20) },
    },
    async ({ query, limit }) => {
      try {
        const source = REGISTRY.get("fgic_national_gazetteer");
        const result = await (dependencies.fetchPlaceRecords ?? fetchResult)(source, { query, limit });
        return text(ok(buildPlaceNamesProduct(result.records, { query, citation: result.citation, fetchedAt: result.fetched_at }), { ...metaOf(result), requested_limit: limit }));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_founder_pathway",
    {
      description: "Build one ordered, privacy-bounded UAE founder journey across official business setup, relevant government-backed startup support and entrepreneur Golden Residency readiness. Planning only; no application, eligibility decision or personal data storage.",
      inputSchema: {
        stage: z.enum(STARTUP_STAGES),
        emirate: z.enum(BUSINESS_EMIRATES),
        setup_type: z.enum(BUSINESS_SETUP_TYPES),
        support_type: z.enum(STARTUP_SUPPORT_TYPES),
        activity_sector: z.enum(BUSINESS_ACTIVITY_SECTORS).optional(),
      },
    },
    async ({ stage, emirate, setup_type, support_type, activity_sector }) => {
      try {
        return text(ok(buildFounderPathway({ stage, emirate, setupType: setup_type, supportType: support_type, activitySector: activity_sector }), { decision: "planning_only", stored: false }));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_business_setup",
    {
      description: "Route a founder to the competent official UAE business-setup authority by emirate and mainland/free-zone path. Read-only, informational, no intermediaries and no personal data stored.",
      inputSchema: { action: z.enum(["list", "route"]).default("list"), emirate: z.enum(BUSINESS_EMIRATES).optional(), setup_type: z.enum(BUSINESS_SETUP_TYPES).optional(), activity_sector: z.enum(BUSINESS_ACTIVITY_SECTORS).optional() },
    },
    async ({ action, emirate, setup_type, activity_sector }) => {
      try {
        if (action === "list") return text(ok(businessSetupCatalogue(), { decision: "routing_only", stored: false }));
        if (!emirate || !setup_type) throw new ValidationError("emirate and setup_type are required for route");
        return text(ok(routeBusinessSetup({ emirate, setupType: setup_type, activitySector: activity_sector }), { decision: "routing_only", stored: false }));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_startup_support",
    {
      description: "Discover current official or government-backed UAE startup support programmes by stage, support need and emirate. Relevance only: never determines eligibility, funding approval or acceptance and stores no personal data.",
      inputSchema: { action: z.enum(["list", "match"]).default("list"), stage: z.enum(STARTUP_STAGES).optional(), support_type: z.enum(STARTUP_SUPPORT_TYPES).optional(), emirate: z.enum(STARTUP_EMIRATES).optional() },
    },
    async ({ action, stage, support_type, emirate }) => {
      try {
        if (action === "list") return text(ok(startupSupportCatalogue(), { decision: "discovery_only", stored: false }));
        if (!stage || !support_type || !emirate) throw new ValidationError("stage, support_type and emirate are required for match");
        return text(ok(matchStartupSupport({ stage, supportType: support_type, emirate }), { decision: "discovery_only", stored: false }));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_golden_residency",
    {
      description: "Explore current official UAE Golden Residency pathways or assess non-identifying evidence readiness. Informational only: never determines eligibility, submits an application, stores personal data, or guarantees approval.",
      inputSchema: {
        action: z.enum(["list", "assess"]).default("list"),
        pathway: z.enum(GOLDEN_PATHWAY_IDS).optional(),
        jurisdiction: z.enum(["federal", "dubai", "abu_dhabi"]).optional(),
        capital_aed: z.number().nonnegative().optional(), property_value_aed: z.number().nonnegative().optional(), annual_tax_aed: z.number().nonnegative().optional(), project_value_aed: z.number().nonnegative().optional(),
        innovative_project_evidence: z.boolean().optional(), incubator_recommendation: z.boolean().optional(), professional_recommendation: z.boolean().optional(),
        attested_degree: z.boolean().optional(), five_years_experience: z.boolean().optional(), employment_contract: z.boolean().optional(), monthly_salary_aed: z.number().nonnegative().optional(), valid_passport_evidence: z.boolean().optional(),
        grade_percent: z.number().min(0).max(100).optional(), university_gpa: z.number().min(0).max(4).optional(), graduated_within_two_years: z.boolean().optional(), ministry_recommendation: z.boolean().optional(), university_recommendation: z.boolean().optional(),
        humanitarian_years: z.number().nonnegative().optional(), volunteer_hours: z.number().nonnegative().optional(), humanitarian_support_aed: z.number().nonnegative().optional(),
      },
    },
    async (input) => {
      try {
        if (input.action === "list") return text(ok(goldenResidencyCatalogue(), { decision: "informational_only", source_id: "icp_golden_residency" }));
        if (!input.pathway) throw new ValidationError("pathway is required for assess");
        const assessment = assessGoldenResidencyReadiness({ pathway: input.pathway, jurisdiction: input.jurisdiction, capitalAed: input.capital_aed, propertyValueAed: input.property_value_aed, annualTaxAed: input.annual_tax_aed, projectValueAed: input.project_value_aed, innovativeProjectEvidence: input.innovative_project_evidence, incubatorRecommendation: input.incubator_recommendation, professionalRecommendation: input.professional_recommendation, attestedDegree: input.attested_degree, fiveYearsExperience: input.five_years_experience, employmentContract: input.employment_contract, monthlySalaryAed: input.monthly_salary_aed, validPassportEvidence: input.valid_passport_evidence, gradePercent: input.grade_percent, universityGpa: input.university_gpa, graduatedWithinTwoYears: input.graduated_within_two_years, ministryRecommendation: input.ministry_recommendation, universityRecommendation: input.university_recommendation, humanitarianYears: input.humanitarian_years, volunteerHours: input.volunteer_hours, humanitarianSupportAed: input.humanitarian_support_aed });
        return text(ok(assessment, { decision: "informational_only", stored: false, source_id: "icp_golden_residency" }));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_education_ledger",
    {
      description: "Read the accredited UAE 2023/2024 national education snapshot and the separate Ministry of Education 2018–2024 resource catalogue. Includes reconciliation checks, source SHA-256, methodology and limitations; it is not a live enrollment feed.",
    },
    async () => {
      try {
        const ledger = buildEducationLedger();
        return text(ok(ledger, {
          source_id: "fcsc_unified_uae_numbers_2025",
          citation: ledger.source.citation,
          catalogue_citation: ledger.source.catalogueCitation,
          fetched_at: ledger.source.retrievedAt,
          delivery: ledger.source.delivery,
          sha256: ledger.source.sha256,
        }));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_health_indicators",
    {
      description: "Search official MOHAP health core indicator rows across published year columns. Values are source-native and not silently normalized; the response states mixed ratio/percentage scale and period limitations.",
      inputSchema: { query: z.string().optional(), limit: z.number().int().min(1).max(200).default(100) },
    },
    async ({ query, limit }) => {
      try {
        const loaded = await loadHealthIndicators(dependencies.fetchHealthRecords ?? fetchResult, { query, limit });
        return text(ok(loaded.report, loaded.meta));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_products_list",
    {
      description: "List the public Open Emirates Intelligence applications with bilingual descriptions, routes, official evidence scope and explicit limitations.",
    },
    async () => {
      const products = listProducts();
      return text(ok(products, { total: products.length, published: products.length }));
    },
  );

  server.registerTool(
    "uae_trade_flow_radar",
    {
      description: "Analyze bounded official Ajman 2023 certificate-of-origin export and re-export records. Returns destination, transport, HS-code, month and origin rankings with explicit sample coverage. Counts are not trade value or total UAE trade.",
      inputSchema: { limit: z.number().int().min(1).max(1000).default(500) },
    },
    async ({ limit }) => {
      try {
        const product = await loadTradeFlowProduct(dependencies.fetchTradeRecords ?? fetchResult, limit);
        return text(ok(product.data, product.meta));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_ajman_business_evidence",
    {
      description: "Explore three distinct official Ajman business-license dataset samples by activity, area, legal form, license type and published status. Samples are not unique-company counts, market size or investment advice.",
      inputSchema: { query: z.string().trim().max(100).optional(), limit: z.number().int().min(1).max(1000).default(500) },
    },
    async ({ query, limit }) => {
      try {
        const product = await loadAjmanBusinessProduct(dependencies.fetchAjmanBusinessRecords ?? fetchResult, limit, query);
        return text(ok(product.data, product.meta));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_ajman_urban_evidence",
    {
      description: "Read six distinct official Ajman building, certified-rent and road datasets as source-native annual series. Measures remain separate and are not a property index, investment return or growth score.",
      inputSchema: { limit: z.number().int().min(1).max(100).default(100) },
    },
    async ({ limit }) => {
      try {
        const product = await loadAjmanUrbanProduct(dependencies.fetchAjmanUrbanRecords ?? fetchResult, limit);
        return text(ok(product.data, product.meta));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_ajman_parks_footfall",
    {
      description: "Read official Ajman monthly park-visit observations by year and source-native park label. Visit counts are not unique people, resident demand, tourism performance, satisfaction, capacity or park quality.",
      inputSchema: {},
    },
    async () => {
      try {
        const product = await loadAjmanParksProduct(dependencies.fetchAjmanParksRecords ?? fetchResult);
        return text(ok(product.data, product.meta));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_evidence_dossier",
    {
      description: "Compose two to five official UAE evidence pillars into one bilingual, source-cited dossier. Keeps periods and units separate, reports unavailable evidence explicitly, and never produces a ranking or composite score.",
      inputSchema: {
        template: z.enum(EVIDENCE_DOSSIER_TEMPLATES).default("research_dossier"),
        question: z.string().trim().min(1).max(200),
        language: z.enum(["en", "ar"]).default("en"),
        pillars: z.array(z.enum(EVIDENCE_PILLAR_IDS)).min(2).max(5).refine((items) => new Set(items).size === items.length, "pillar ids must be unique"),
        query: z.string().trim().max(100).optional(),
        emirate: z.enum(BUSINESS_EMIRATES).optional(),
        healthFacilitiesLimit: z.number().int().min(1).max(200).default(50),
        healthIndicatorsLimit: z.number().int().min(1).max(50).default(12),
        industryLimit: z.number().int().min(1).max(100).default(50),
      },
    },
    async ({ template, question, language, pillars, query, emirate, healthFacilitiesLimit, healthIndicatorsLimit, industryLimit }) => {
      try {
        const result = await loadEvidenceDossier({ template, question, language, pillars, query, emirate, healthFacilitiesLimit, healthIndicatorsLimit, industryLimit }, {
          fetchHealthFacilitiesRecords: dependencies.fetchHealthFacilitiesRecords,
          fetchHealthIndicatorsRecords: dependencies.fetchHealthRecords,
          fetchIndustryRecords: dependencies.fetchIndustryRecords,
          fetchTaxRecords: dependencies.fetchTaxRecords,
        });
        return text(ok(result.data, { ...result.meta, stored: false }));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_policy_evidence_watch",
    {
      description: "Read retained checks or run a bounded check across five audited official UAE legislation, tax, labour, residency and Cabinet pages. Detects published-page content changes only; it never determines legal effect, effective date or eligibility.",
      inputSchema: {
        action: z.enum(["report", "check"]).default("report"),
        source_ids: z.array(z.enum(POLICY_WATCH_SOURCE_IDS)).min(1).max(5).refine((items) => new Set(items).size === items.length, "source ids must be unique").optional(),
      },
    },
    async ({ action, source_ids }) => {
      try {
        const store = dependencies.policyEvidenceStore ?? policyEvidenceStore();
        if (action === "report") return text(ok(policyEvidenceWatchReport(store), { hidden_upstream_work: false }));
        const ids = source_ids ?? POLICY_WATCH_SOURCE_IDS;
        const result = await checkPolicyEvidenceWatch(ids, { getText: dependencies.fetchPolicyPage, store });
        return text(ok(result, { stores_user_data: false, stores_page_evidence: true }));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_national_evidence_brief",
    {
      description: "Read education, health, industry and FTA service activity side by side with source-native units, periods, citations and explicit limitations. No composite score or cross-pillar ranking is produced.",
      inputSchema: { healthLimit: z.number().int().min(1).max(50).default(12), industryLimit: z.number().int().min(1).max(100).default(50), emirate: z.enum(BUSINESS_EMIRATES).optional(), query: z.string().trim().max(100).optional() },
    },
    async ({ healthLimit, industryLimit, emirate, query }) => {
      try {
        const result = await loadNationalEvidenceBrief({ healthLimit, industryLimit, emirate, query }, { fetchHealthRecords: dependencies.fetchHealthRecords, fetchIndustryRecords: dependencies.fetchIndustryRecords, fetchTaxRecords: dependencies.fetchTaxRecords });
        return text(ok(result.data, result.meta));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_health_facilities_atlas",
    {
      description: "Explore official MOHAP aggregate facility counts for 2015–2024 by emirate, sector, category and type. Rows are not individual facilities; results do not measure beds, capacity, access or quality.",
      inputSchema: { year: z.enum(HEALTH_FACILITY_YEARS.map(String) as [string, ...string[]]).default("2024"), emirate: z.enum(HEALTH_FACILITY_EMIRATES).optional(), sector: z.enum(HEALTH_FACILITY_SECTORS).optional(), category: z.string().trim().max(100).optional(), facilityType: z.string().trim().max(100).optional(), query: z.string().trim().max(100).optional(), limit: z.number().int().min(1).max(200).default(100) },
    },
    async ({ year, emirate, sector, category, facilityType, query, limit }) => {
      try {
        const loaded = await loadHealthFacilitiesAtlas(dependencies.fetchHealthFacilitiesRecords ?? fetchResult, { year: Number(year), emirate, sector, category, facilityType, query, rowLimit: limit });
        return text(ok(loaded.data, loaded.meta));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_tax_service_activity",
    {
      description: "Read the official FTA 2025 service-activity report with quarterly totals, methodology, limitations and citation. Counts are not tax revenue, taxpayers, companies, or economic growth.",
    },
    async () => {
      try {
        const source = REGISTRY.get("fta_service_activity_2025");
        const result = await (dependencies.fetchTaxRecords ?? fetchResult)(source, { limit: 10 });
        return text(ok(buildTaxServiceReport(result.records, { citation: result.citation, fetchedAt: result.fetched_at }), {
          ...metaOf(result), source_id: source.id, returned_records: result.records.length,
        }));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_tax_service_archive",
    {
      description: "Read the official FTA source-native service workbooks for 2017–2022, 2024 and 2025. Cross-year comparison is deliberately unavailable because scopes and schemas differ and 2023 is missing.",
    },
    async () => {
      try {
        const views = await loadTaxArchiveViews(dependencies.fetchTaxArchiveRecords ?? fetchResult);
        return text(ok(buildTaxArchive(views), { source_ids: TAX_ARCHIVE_SPECS.map(([sourceId]) => sourceId), comparison_status: "unavailable" }));
      } catch (error) { return text(fail(error)); }
    },
  );

  server.registerTool(
    "uae_industry_atlas",
    {
      description: "Build an evidence-backed UAE industrial-establishment atlas from a bounded official MOIAT sample. Counts are never presented as population totals without upstream coverage proof.",
      inputSchema: { action: z.enum(["atlas", "change"]).default("atlas"), emirate: z.string().optional(), query: z.string().optional(), limit: z.number().int().min(1).max(1000).default(500) },
    },
    async ({ action, emirate, query, limit }) => {
      try {
        const source = REGISTRY.get("moiat_industrial_licenses");
        if (action === "change") {
          const store = reliabilityStore();
          const snapshots = store.listSnapshots(source.id, null, 100);
          const diff = snapshots.length >= 2
            ? store.diffSnapshots(Number(snapshots[1].id), Number(snapshots[0].id))
            : undefined;
          return text(ok(buildIndustrialChangeReport(snapshots, diff), {
            source_id: source.id,
            citation: citation(source),
            snapshot_policy: "changed_content_only",
          }));
        }
        const result = await fetchResult(source, { limit });
        const atlas = buildIndustryAtlas(result.records, {
          sourceId: source.id, citation: result.citation, fetchedAt: result.fetched_at,
          upstreamTotal: result.total, qualityScore: result.data_quality.quality_score, emirate, query,
        });
        return text(ok(atlas, { ...metaOf(result), requested_limit: limit }));
      } catch (error) { return text(fail(error)); }
    },
  );

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
    "runtime_tool_catalog",
    "uae://tools",
    { title: "Runtime MCP tool catalog", description: "Generated directly from every currently registered MCP tool and its runtime description.", mimeType: "application/json" },
    async (uri) => {
      const registered = (server as unknown as { _registeredTools: Record<string, { description?: string }> })._registeredTools;
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: json(createToolCatalog(registered, VERSION)) }] };
    },
  );

  server.registerResource(
    "policy_evidence_watch_methodology",
    "uae://policy-watch/methodology",
    { title: "UAE Policy Evidence Watch methodology", description: "Audited sources, hashing rules, retention boundaries and prohibited legal interpretations.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: json({ sources: POLICY_WATCH_SOURCE_IDS, operation: "normalized_text_hash_diff", storesUserData: false, retainedContent: "SHA-256 plus excerpts capped at 240 characters", legalEffectDetermined: false, effectiveDateDetermined: false, eligibilityDetermined: false, unavailableMeansUnchanged: false }) }] }),
  );

  server.registerResource(
    "evidence_studio_methodology",
    "uae://evidence-studio/methodology",
    { title: "UAE Evidence Studio methodology", description: "Composition rules, supported pillars and prohibited cross-source interpretations.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: json({ pillars: EVIDENCE_PILLAR_IDS, templates: EVIDENCE_DOSSIER_TEMPLATES, minimumPillars: 2, maximumPillars: 5, stored: false, usesGenerativeModel: false, crossEvidenceAggregation: false, compositeScore: false, ranking: false, unavailableMeansZero: false }) }] }),
  );

  server.registerResource(
    "health_facilities_atlas_methodology",
    "uae://health-facilities/methodology",
    { title: "UAE Health Facilities Atlas methodology", description: "Aggregate observation grain, filters, evidence boundaries and prohibited interpretations.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: json({ period: "2015–2024", grain: ["year", "emirate", "sector", "main_category", "facility_type"], unit: "published aggregate facility count", individualFacilityDirectory: false, coordinates: "emirate reference points only", prohibitedClaims: ["beds", "capacity", "workforce", "accessibility", "quality", "health outcomes", "best emirate"], metadataWarning: "Embedded metadata says 2015–2022/updated 2022 while data includes 2023–2024." }) }] }),
  );

  server.registerResource(
    "national_evidence_brief_methodology",
    "uae://national-brief/methodology",
    { title: "UAE National Evidence Brief methodology", description: "Rules for reading four source-native evidence pillars without false comparison or composite scoring.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: json({ pillars: ["education", "health", "industry", "tax_activity"], crossPillarAggregation: false, compositeScore: false, unavailableMeansZero: false, filters: { emirate: "industry only", query: "health and industry only" } }) }] }),
  );

  server.registerResource(
    "public_products",
    "uae://products",
    { title: "Open Emirates public products", description: "Published bilingual applications with routes, evidence scope and limitations.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: json({ total: listProducts().length, products: listProducts() }) }] }),
  );

  server.registerResource(
    "industry_atlas_methodology",
    "uae://industry-atlas/methodology",
    { title: "UAE Industry Atlas methodology", description: "Scope, unit of analysis, evidence rules and limitations for industrial atlas answers.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: json({
      unit: "industrial establishment record", sourceId: "moiat_industrial_licenses",
      countingRule: "one returned license record equals one observed establishment record",
      populationClaimAllowed: false,
      limitations: ["Bounded samples are not UAE totals.", "License records do not prove current operation.", "Product-label counts are not production volumes."],
    }) }] }),
  );

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
