type RecordRow = Readonly<Record<string, unknown>>;

export interface HealthIndicator {
  name: string;
  latest: { year: number; value: number };
  series?: Array<{ year: number; value: number }>;
  quality?: { flags: HealthIndicatorQualityFlag[] };
}

export interface HealthIndicatorQualityFlag {
  code: "scale_shift" | "relative_outlier";
  severity: "warning";
  years: number[];
  message: string;
}

export interface HealthIndicatorsReport {
  kind: "mohap_health_core_indicators_2024";
  title: { en: string; ar: string };
  scope: {
    publishedRows: number;
    usableIndicators: number;
    matchedIndicators: number;
    returnedIndicators: number;
    flaggedIndicators: number;
    offset: number;
    compact: boolean;
    hasMore: boolean;
    nextOffset: number | null;
    years: number[];
  };
  indicators: HealthIndicator[];
  source: { citation: string; fetchedAt: string; unit: "indicator row"; delivery?: "live" | "verified_snapshot"; sha256?: string };
  methodology: string[];
  limitations: string[];
}

const YEAR = /^20\d{2}$/;

export function buildHealthIndicators(
  records: readonly RecordRow[],
  options: { citation: string; fetchedAt: string; query?: string; limit?: number; offset?: number; compact?: boolean },
): HealthIndicatorsReport {
  const years = [...new Set(records.flatMap((record) => Object.keys(record).filter((key) => YEAR.test(key)).map(Number)))].sort();
  const indicators = records.flatMap((record): HealthIndicator[] => {
    const name = String(record["Indicator Name"] ?? "").trim();
    const series = years.flatMap((year) => {
      const value = record[String(year)];
      return typeof value === "number" && Number.isFinite(value) ? [{ year, value }] : [];
    });
    if (!name || !series.length) return [];
    const flags = healthIndicatorQualityFlags(series);
    return [{ name, latest: series.at(-1)!, series, ...(flags.length ? { quality: { flags } } : {}) }];
  });
  const query = options.query?.trim().toLocaleLowerCase() ?? "";
  const matched = query ? indicators.filter((indicator) => indicator.name.toLocaleLowerCase().includes(query)) : indicators;
  const limit = Math.max(1, Math.min(options.limit ?? 100, 200));
  const offset = Math.max(0, Math.min(options.offset ?? 0, matched.length));
  const page = matched.slice(offset, offset + limit);
  const compact = options.compact ?? false;
  const returned = compact
    ? page.map(({ series: _series, ...indicator }) => indicator)
    : page;
  const nextOffset = offset + page.length;

  return {
    kind: "mohap_health_core_indicators_2024",
    title: { en: "UAE Health Core Indicators", ar: "المؤشرات الصحية الأساسية في الإمارات" },
    scope: {
      publishedRows: records.length,
      usableIndicators: indicators.length,
      matchedIndicators: matched.length,
      returnedIndicators: page.length,
      flaggedIndicators: indicators.filter((indicator) => indicator.quality?.flags.length).length,
      offset,
      compact,
      hasMore: nextOffset < matched.length,
      nextOffset: nextOffset < matched.length ? nextOffset : null,
      years,
    },
    indicators: returned,
    source: { citation: options.citation, fetchedAt: options.fetchedAt, unit: "indicator row" },
    methodology: [
      "Each returned item is one row from the official MOHAP workbook.",
      "Numeric year cells are preserved exactly and null or blank cells are omitted from the series.",
      "Quality flags are generic per-series checks; they never replace or normalize raw values.",
      "Latest means the latest non-empty year in that row, not a current live measurement.",
    ],
    limitations: [
      "Values are source-native and are not normalized; ratio and percentage scales may differ by indicator or year.",
      "The workbook is published as the 2024 report, while its visible time-series columns currently end at 2023.",
      "The platform does not infer causality, national targets, improvement or deterioration from these rows.",
    ],
  };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function healthIndicatorQualityFlags(series: ReadonlyArray<{ year: number; value: number }>): HealthIndicatorQualityFlag[] {
  const flags: HealthIndicatorQualityFlag[] = [];
  const nonNegative = series.filter(({ value }) => value >= 0);
  const hasFractionScale = nonNegative.some(({ value }) => value > 0 && value <= 1);
  const hasWholePercentScale = nonNegative.some(({ value }) => value > 1 && value <= 100);
  if (hasFractionScale && hasWholePercentScale) {
    flags.push({
      code: "scale_shift",
      severity: "warning",
      years: nonNegative.filter(({ value }) => value > 0 && value <= 100).map(({ year }) => year),
      message: "This series mixes fraction-like (0–1) and whole-percentage-like (1–100) values; raw values are unchanged.",
    });
  }

  const outlierYears = series.flatMap(({ year, value }, index) => {
    if (value <= 0) return [];
    const peers = series.filter((_, peerIndex) => peerIndex !== index).map((point) => Math.abs(point.value)).filter((peer) => peer > 0);
    if (peers.length < 2) return [];
    const baseline = median(peers);
    const ratio = Math.abs(value) / baseline;
    return ratio >= 20 || ratio <= 0.05 ? [year] : [];
  });
  if (outlierYears.length) {
    flags.push({
      code: "relative_outlier",
      severity: "warning",
      years: outlierYears,
      message: "One or more values differ by at least 20× from the median of peer years; verify source scale or transcription before interpretation.",
    });
  }
  return flags;
}
