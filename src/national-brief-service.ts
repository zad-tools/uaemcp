import { fetchResult } from "./connectors.js";
import { buildEducationLedger } from "./education-ledger.js";
import { loadHealthIndicators } from "./health-indicators-service.js";
import { buildIndustryAtlas } from "./industry-atlas.js";
import {
  availablePillar,
  buildNationalEvidenceBrief,
  educationPillar,
  healthPillar,
  unavailablePillar,
  type NationalBriefPillar,
} from "./national-brief.js";
import { REGISTRY, citation } from "./sources.js";
import { buildTaxServiceReport } from "./tax-services.js";

type Fetcher = typeof fetchResult;

export interface NationalBriefOptions {
  healthLimit?: number;
  industryLimit?: number;
  emirate?: string;
  query?: string;
}

export interface NationalBriefDependencies {
  fetchHealthRecords?: Fetcher;
  fetchIndustryRecords?: Fetcher;
  fetchTaxRecords?: Fetcher;
  now?: () => string;
}

async function loadIndustry(fetcher: Fetcher, options: Required<Pick<NationalBriefOptions, "industryLimit">> & Pick<NationalBriefOptions, "emirate" | "query">): Promise<NationalBriefPillar> {
  const source = REGISTRY.get("moiat_industrial_licenses");
  const result = await fetcher(source, { limit: options.industryLimit });
  const report = buildIndustryAtlas(result.records, {
    sourceId: source.id,
    citation: result.citation,
    fetchedAt: result.fetched_at,
    upstreamTotal: result.total,
    qualityScore: result.data_quality.quality_score,
    emirate: options.emirate,
    query: options.query,
  });
  return availablePillar("industry", report, {
    period: null,
    unit: "bounded industrial-establishment record",
    sourceId: source.id,
    citation: result.citation,
    fetchedAt: result.fetched_at,
    limitations: report.limitations,
  });
}

async function loadTax(fetcher: Fetcher): Promise<NationalBriefPillar> {
  const source = REGISTRY.get("fta_service_activity_2025");
  const result = await fetcher(source, { limit: 10 });
  const report = buildTaxServiceReport(result.records, { citation: result.citation, fetchedAt: result.fetched_at });
  return availablePillar("tax_activity", report, {
    period: report.period,
    unit: "published service-activity count",
    sourceId: source.id,
    citation: result.citation,
    fetchedAt: result.fetched_at,
    limitations: report.limitations,
  });
}

function unavailable(id: "industry" | "tax_activity", error: unknown): NationalBriefPillar {
  const sourceId = id === "industry" ? "moiat_industrial_licenses" : "fta_service_activity_2025";
  const source = REGISTRY.get(sourceId);
  return unavailablePillar(id, {
    period: id === "tax_activity" ? "2025" : null,
    unit: id === "industry" ? "bounded industrial-establishment record" : "published service-activity count",
    sourceId,
    citation: citation(source),
    error,
    limitations: id === "industry"
      ? ["The industrial source was unavailable; no establishment count, distribution or zero value is inferred."]
      : ["The FTA source was unavailable; no service activity, revenue, taxpayer or zero value is inferred."],
  });
}

export async function loadNationalEvidenceBrief(options: NationalBriefOptions = {}, dependencies: NationalBriefDependencies = {}) {
  const healthLimit = Math.max(1, Math.min(options.healthLimit ?? 12, 50));
  const industryLimit = Math.max(1, Math.min(options.industryLimit ?? 50, 100));
  const healthFetcher = dependencies.fetchHealthRecords ?? fetchResult;
  const industryFetcher = dependencies.fetchIndustryRecords ?? fetchResult;
  const taxFetcher = dependencies.fetchTaxRecords ?? fetchResult;

  const education = educationPillar(buildEducationLedger());
  const [healthResult, industryResult, taxResult] = await Promise.allSettled([
    loadHealthIndicators(healthFetcher, { query: options.query, limit: healthLimit }),
    loadIndustry(industryFetcher, { industryLimit, emirate: options.emirate, query: options.query }),
    loadTax(taxFetcher),
  ]);

  const health = healthResult.status === "fulfilled"
    ? healthPillar(healthResult.value.report, healthResult.value.meta)
    : unavailablePillar("health", {
      period: null,
      unit: "source-native indicator row",
      sourceId: "mohap_health_core_indicators_2024",
      citation: citation(REGISTRY.get("mohap_health_core_indicators_2024")),
      error: healthResult.reason,
      limitations: ["Health evidence was unavailable; no indicator value or zero is inferred."],
    });
  const industry = industryResult.status === "fulfilled" ? industryResult.value : unavailable("industry", industryResult.reason);
  const tax = taxResult.status === "fulfilled" ? taxResult.value : unavailable("tax_activity", taxResult.reason);
  const report = buildNationalEvidenceBrief([education, health, industry, tax], dependencies.now?.() ?? new Date().toISOString());

  return {
    data: report,
    meta: {
      source_ids: report.pillars.map((pillar) => pillar.evidence.sourceId),
      partial: report.scope.pillarsDegraded > 0,
      available_pillars: report.scope.pillarsAvailable,
      degraded_pillars: report.scope.pillarsDegraded,
      generated_at: report.generatedAt,
      filters: { health_limit: healthLimit, industry_limit: industryLimit, emirate: options.emirate ?? null, query: options.query ?? null },
    },
  };
}
