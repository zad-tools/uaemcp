import type { FetchResult } from "./connectors.js";
import { REGISTRY, type Source } from "./sources.js";

type Row = Record<string, unknown>;

export const TAX_ARCHIVE_SPECS = [
  ["fta_selected_services_2017_2022", "2017–2022", 5],
  ["fta_service_activity_2024", "2024", 17],
  ["fta_service_activity_2025", "2025", 10],
] as const;

export interface TaxArchiveView {
  sourceId: string;
  period: string;
  records: Row[];
  citation: string;
  fetchedAt: string;
  license?: string;
  dataQuality?: FetchResult["data_quality"];
  lineage?: Array<Record<string, unknown>>;
}

export async function loadTaxArchiveViews(fetcher: (source: Source, options: { limit: number }) => Promise<FetchResult>): Promise<TaxArchiveView[]> {
  return Promise.all(TAX_ARCHIVE_SPECS.map(async ([sourceId, period, limit]) => {
    const source = REGISTRY.get(sourceId);
    const result = await fetcher(source, { limit });
    return {
      sourceId, period, records: result.records, citation: result.citation, fetchedAt: result.fetched_at,
      license: result.license, dataQuality: result.data_quality,
      lineage: [{ operation: "source_native_fetch", sourceId, connector: source.kind, recordLimit: limit }],
    };
  }));
}

export function buildTaxArchive(views: TaxArchiveView[]) {
  return {
    kind: "fta_source_native_archive",
    views: views.map((view) => ({ ...view, recordCount: view.records.length })),
    comparison: { status: "unavailable" as const, missingPeriods: ["2023"] },
    methodology: {
      presentation: "Each official workbook is presented in its source-native schema. Values are not normalized or summed across periods.",
      comparisonGate: "Cross-period comparison remains disabled until scopes, labels, units and the 2024 unlabelled column are resolved with an explicit mapping.",
    },
    warnings: [
      "The 2017–2022 workbook covers five selected services only; it is not a complete FTA activity series.",
      "The 2024 workbook contains an unlabelled column after March and a duplicate service label; no annual total is calculated.",
      "The 2025 workbook uses nine quarterly service categories and is not assumed comparable with earlier files.",
      "No equivalent official 2023 workbook is registered; the gap is not estimated or filled.",
    ],
  };
}
