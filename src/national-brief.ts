import type { EducationLedger } from "./education-ledger.js";
import type { HealthIndicatorsReport } from "./health-indicators.js";

export type NationalBriefPillarStatus = "available" | "snapshot" | "unavailable";

export interface NationalBriefPillar {
  id: "education" | "health" | "industry" | "tax_activity";
  status: NationalBriefPillarStatus;
  period: string | null;
  unit: string;
  data: unknown;
  evidence: Record<string, unknown>;
  limitations: string[];
}

export interface NationalEvidenceBrief {
  kind: "uae_national_evidence_brief";
  generatedAt: string;
  scope: {
    jurisdiction: "UAE";
    pillarsRequested: 4;
    pillarsAvailable: number;
    pillarsDegraded: number;
  };
  pillars: NationalBriefPillar[];
  methodology: {
    operation: "side_by_side_source_native_evidence";
    crossPillarAggregation: false;
    compositeScore: false;
  };
  limitations: string[];
  citations: string[];
}

export function educationPillar(ledger: EducationLedger): NationalBriefPillar {
  return {
    id: "education",
    status: "snapshot",
    period: ledger.period,
    unit: "published national education snapshot",
    data: ledger,
    evidence: {
      sourceId: "fcsc_unified_uae_numbers_2025",
      delivery: ledger.source.delivery,
      citation: ledger.source.citation,
      sha256: ledger.source.sha256,
    },
    limitations: [...ledger.limitations],
  };
}

export function healthPillar(report: HealthIndicatorsReport, meta: Record<string, unknown>): NationalBriefPillar {
  const delivery = meta.delivery === "verified_snapshot" ? "snapshot" : "available";
  return {
    id: "health",
    status: delivery,
    period: report.scope.years.length ? `${report.scope.years[0]}–${report.scope.years.at(-1)}` : null,
    unit: "source-native indicator row",
    data: report,
    evidence: {
      sourceId: "mohap_health_core_indicators_2024",
      delivery: meta.delivery ?? "live",
      citation: meta.citation,
      fetchedAt: meta.fetched_at,
      sha256: meta.sha256,
    },
    limitations: [...report.limitations],
  };
}

export function availablePillar(
  id: "industry" | "tax_activity",
  data: Record<string, unknown>,
  options: { period: string | null; unit: string; sourceId: string; citation: string; fetchedAt: string; limitations: string[] },
): NationalBriefPillar {
  return {
    id,
    status: "available",
    period: options.period,
    unit: options.unit,
    data,
    evidence: { sourceId: options.sourceId, delivery: "live", citation: options.citation, fetchedAt: options.fetchedAt },
    limitations: [...options.limitations],
  };
}

export function unavailablePillar(
  id: "education" | "health" | "industry" | "tax_activity",
  options: { period: string | null; unit: string; sourceId: string; citation: string; error: unknown; limitations: string[] },
): NationalBriefPillar {
  return {
    id,
    status: "unavailable",
    period: options.period,
    unit: options.unit,
    data: null,
    evidence: {
      sourceId: options.sourceId,
      delivery: "unavailable",
      citation: options.citation,
      error: options.error instanceof Error ? options.error.message : String(options.error),
    },
    limitations: [...options.limitations],
  };
}

export function buildNationalEvidenceBrief(pillars: NationalBriefPillar[], generatedAt = new Date().toISOString()): NationalEvidenceBrief {
  const orderedIds = ["education", "health", "industry", "tax_activity"] as const;
  const byId = new Map(pillars.map((pillar) => [pillar.id, pillar]));
  const ordered = orderedIds.flatMap((id) => {
    const pillar = byId.get(id);
    return pillar ? [pillar] : [];
  });
  const citations = [...new Set(ordered.map((pillar) => pillar.evidence.citation).filter((value): value is string => typeof value === "string" && value.length > 0))];
  const pillarsAvailable = ordered.filter((pillar) => pillar.status !== "unavailable").length;

  return {
    kind: "uae_national_evidence_brief",
    generatedAt,
    scope: { jurisdiction: "UAE", pillarsRequested: 4, pillarsAvailable, pillarsDegraded: 4 - pillarsAvailable },
    pillars: ordered,
    methodology: {
      operation: "side_by_side_source_native_evidence",
      crossPillarAggregation: false,
      compositeScore: false,
    },
    limitations: [
      "Each pillar has a different source, period, unit and coverage; values must not be added, ranked together or converted into a national composite score.",
      "The brief does not infer causality, forecast economic performance or provide an investment recommendation.",
      "Unavailable evidence is reported explicitly and is never represented as zero.",
      "The emirate filter applies only to the bounded industrial-license sample; the text query applies to health and industry only. Neither filter changes education or tax activity.",
    ],
    citations,
  };
}
