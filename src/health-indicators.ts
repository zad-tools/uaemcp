type RecordRow = Readonly<Record<string, unknown>>;

export interface HealthIndicator {
  name: string;
  latest: { year: number; value: number };
  series: Array<{ year: number; value: number }>;
}

export interface HealthIndicatorsReport {
  kind: "mohap_health_core_indicators_2024";
  title: { en: string; ar: string };
  scope: {
    publishedRows: number;
    usableIndicators: number;
    matchedIndicators: number;
    returnedIndicators: number;
    years: number[];
  };
  indicators: HealthIndicator[];
  source: { citation: string; fetchedAt: string; unit: "indicator row" };
  methodology: string[];
  limitations: string[];
}

const YEAR = /^20\d{2}$/;

export function buildHealthIndicators(
  records: readonly RecordRow[],
  options: { citation: string; fetchedAt: string; query?: string; limit?: number },
): HealthIndicatorsReport {
  const years = [...new Set(records.flatMap((record) => Object.keys(record).filter((key) => YEAR.test(key)).map(Number)))].sort();
  const indicators = records.flatMap((record): HealthIndicator[] => {
    const name = String(record["Indicator Name"] ?? "").trim();
    const series = years.flatMap((year) => {
      const value = record[String(year)];
      return typeof value === "number" && Number.isFinite(value) ? [{ year, value }] : [];
    });
    if (!name || !series.length) return [];
    return [{ name, latest: series.at(-1)!, series }];
  });
  const query = options.query?.trim().toLocaleLowerCase() ?? "";
  const matched = query ? indicators.filter((indicator) => indicator.name.toLocaleLowerCase().includes(query)) : indicators;
  const limit = Math.max(1, Math.min(options.limit ?? 100, 200));

  return {
    kind: "mohap_health_core_indicators_2024",
    title: { en: "UAE Health Core Indicators", ar: "المؤشرات الصحية الأساسية في الإمارات" },
    scope: {
      publishedRows: records.length,
      usableIndicators: indicators.length,
      matchedIndicators: matched.length,
      returnedIndicators: Math.min(matched.length, limit),
      years,
    },
    indicators: matched.slice(0, limit),
    source: { citation: options.citation, fetchedAt: options.fetchedAt, unit: "indicator row" },
    methodology: [
      "Each returned item is one row from the official MOHAP workbook.",
      "Numeric year cells are preserved exactly and null or blank cells are omitted from the series.",
      "Latest means the latest non-empty year in that row, not a current live measurement.",
    ],
    limitations: [
      "Values are source-native and are not normalized; ratio and percentage scales may differ by indicator or year.",
      "The workbook is published as the 2024 report, while its visible time-series columns currently end at 2023.",
      "The platform does not infer causality, national targets, improvement or deterioration from these rows.",
    ],
  };
}
