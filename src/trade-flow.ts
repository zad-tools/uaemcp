import { normalizeText } from "./glossary.js";

type Row = Record<string, unknown>;
export type TradeFlowKind = "export" | "re_export";

export const TRADE_DATASETS: ReadonlyArray<readonly [string, TradeFlowKind]> = [
  ["export-coo-in-2023", "export"],
  ["coo-re-export-2023-part-1", "re_export"],
  ["coo-re-export-2023-part-2", "re_export"],
  ["coo-re-export-2023-part-3", "re_export"],
];

export interface TradeDatasetEvidence {
  dataset: string;
  flow: TradeFlowKind;
  records: Row[];
  upstreamTotal: number | null;
  citation: string;
  license: string;
  dataQuality: Record<string, unknown>;
  fetchedAt: string;
}

interface Evidence {
  citation: string;
  fetchedAt: string;
}

const label = (value: unknown): string => typeof value === "string" && value.trim() ? value.trim() : "Unknown";
const percent = (value: number, total: number): number => total ? Number(((value / total) * 100).toFixed(2)) : 0;

function rank(
  rows: Row[],
  englishField: string,
  arabicField?: string,
  top = 12,
): Array<{ nameEn: string; nameAr: string; records: number; sharePercent: number }> {
  const groups = new Map<string, { nameEn: string; nameAr: string; records: number }>();
  for (const row of rows) {
    const nameEn = label(row[englishField]);
    const nameAr = arabicField ? label(row[arabicField]) : nameEn;
    const key = normalizeText(nameEn === "Unknown" ? nameAr : nameEn);
    const current = groups.get(key) ?? { nameEn, nameAr: nameAr === "Unknown" ? nameEn : nameAr, records: 0 };
    groups.set(key, { ...current, records: current.records + 1 });
  }
  return [...groups.values()]
    .sort((a, b) => b.records - a.records || a.nameEn.localeCompare(b.nameEn))
    .slice(0, top)
    .map((item) => ({ ...item, sharePercent: percent(item.records, rows.length) }));
}

function productRank(rows: Row[]) {
  const normalized = rows.map((row) => ({ ...row, product: String(row.productcode ?? "Unknown") }));
  return rank(normalized, "product", undefined, 12).map((item) => ({ ...item, hsCode: item.nameEn }));
}

function flowView(rows: Row[], includeOrigins: boolean, upstreamRecords: number | null) {
  return {
    sampledRecords: rows.length,
    upstreamRecords,
    coverageRatio: upstreamRecords && upstreamRecords > 0 ? Number((rows.length / upstreamRecords).toFixed(6)) : null,
    destinations: rank(rows, "destinationen", "destinationar"),
    transportModes: rank(rows, "moten", "motar", 8),
    productCodes: productRank(rows),
    months: rank(rows, "coomonth", undefined, 12),
    origins: includeOrigins ? rank(rows, "origincountryname", undefined, 12) : [],
  };
}

export function buildTradeFlowRadar(datasets: TradeDatasetEvidence[], evidence: Evidence) {
  const exportRows = datasets.filter((item) => item.flow === "export").flatMap((item) => item.records);
  const reExportRows = datasets.filter((item) => item.flow === "re_export").flatMap((item) => item.records);
  const sampledRecords = exportRows.length + reExportRows.length;
  const knownTotals = datasets.map((item) => item.upstreamTotal).filter((value): value is number => typeof value === "number");
  const upstreamRecords = knownTotals.length === datasets.length ? knownTotals.reduce((sum, value) => sum + value, 0) : null;
  const coverageRatio = upstreamRecords && upstreamRecords > 0 ? Number((sampledRecords / upstreamRecords).toFixed(6)) : null;
  const totalFor = (flow: TradeFlowKind): number | null => {
    const selected = datasets.filter((item) => item.flow === flow);
    return selected.every((item) => typeof item.upstreamTotal === "number")
      ? selected.reduce((sum, item) => sum + (item.upstreamTotal ?? 0), 0)
      : null;
  };

  return {
    kind: "ajman_2023_trade_flow_evidence",
    generatedAt: new Date().toISOString(),
    fetchedAt: evidence.fetchedAt,
    geography: { emirate: "Ajman", country: "United Arab Emirates" },
    period: "2023",
    scope: { sampledRecords, upstreamRecords, coverageRatio, completePopulation: coverageRatio === 1, datasets: datasets.map((item) => ({ id: item.dataset, flow: item.flow, sampledRecords: item.records.length, upstreamRecords: item.upstreamTotal, citation: item.citation, license: item.license, dataQuality: item.dataQuality, fetchedAt: item.fetchedAt, lineage: [{ operation: "fetch", connector: "opendatasoft", dataset: item.dataset }, { operation: "bounded_categorical_ranking", flow: item.flow }] })) },
    flows: { export: flowView(exportRows, false, totalFor("export")), re_export: flowView(reExportRows, true, totalFor("re_export")) },
    methodology: {
      unit: "certificate_of_origin_line_record",
      operation: "rank categorical fields within bounded official dataset samples",
      flowSeparation: "export and re-export datasets remain separate; re-export parts are concatenated only within the same published 2023 series",
    },
    evidence: {
      sourceId: "ajman_data_portal",
      citation: evidence.citation,
      citations: [...new Set(datasets.map((item) => item.citation))],
      licenses: [...new Set(datasets.map((item) => item.license))],
      datasetIds: datasets.map((item) => item.dataset),
      qualityScore: datasets.length ? Number((datasets.reduce((sum, item) => sum + Number(item.dataQuality.quality_score ?? 0), 0) / datasets.length).toFixed(3)) : null,
      lineage: datasets.flatMap((item) => [{ operation: "fetch", dataset: item.dataset }, { operation: "rank", flow: item.flow }]),
    },
    limitations: [
      "Counts are certificate-of-origin line records, not trade value, weight, shipment count, company count, or total UAE trade.",
      "The evidence describes datasets published by Ajman, not a national UAE trade population.",
      "Rankings describe the bounded returned sample unless coverageRatio equals 1.",
      "Repeated certificate lines or product origins may legitimately appear more than once in the source.",
    ],
    citations: [...new Set(datasets.map((item) => item.citation))],
  };
}
