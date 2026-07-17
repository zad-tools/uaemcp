export type ConnectivitySeriesId = "active_mobile_subscriptions" | "broadband_per_100_inhabitants" | "fixed_lines_per_100_inhabitants";
type Row = Readonly<Record<string, unknown>>;
type Provenance = Readonly<{ sourceId: string; citation: string }>;

export interface ConnectivityOptions {
  series?: ConnectivitySeriesId;
  from?: string;
  to?: string;
}

export interface ConnectivityInput {
  active_mobile_subscriptions: ReadonlyArray<Row>;
  broadband_per_100_inhabitants: ReadonlyArray<Row>;
  fixed_lines_per_100_inhabitants: ReadonlyArray<Row>;
}

const DEFINITIONS = [
  { id: "active_mobile_subscriptions", titleEn: "Active mobile subscriptions", titleAr: "اشتراكات الهاتف المتحرك الفعالة", field: "Active Mobile Subscriptions[ii]", unit: "subscriptions" },
  { id: "broadband_per_100_inhabitants", titleEn: "Broadband internet subscriptions per 100 inhabitants", titleAr: "اشتراكات الإنترنت عريض النطاق لكل 100 نسمة", field: "Broadband Internet Subscriptions per 100 inhabitants", unit: "subscriptions_per_100_inhabitants" },
  { id: "fixed_lines_per_100_inhabitants", titleEn: "Fixed lines per 100 inhabitants", titleAr: "الخطوط الثابتة لكل 100 نسمة", field: "Fixed lines per 100 inhabitants", unit: "lines_per_100_inhabitants" },
] as const;
export const CONNECTIVITY_SERIES_IDS = DEFINITIONS.map(({ id }) => id) as readonly ConnectivitySeriesId[];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function excelSerialToIsoDate(serial: number): string {
  if (!Number.isInteger(serial) || serial < 1) throw new Error("invalid TDRA connectivity row: Statistics must be an Excel date serial");
  return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000).toISOString().slice(0, 10);
}

function number(value: unknown): number {
  const normalized = typeof value === "string" ? value.replace(/[\s\u00a0,]/g, "") : value;
  const result = typeof normalized === "number" ? normalized : Number(normalized);
  if (!Number.isFinite(result) || result < 0) throw new Error("invalid TDRA connectivity row: value must be a non-negative number");
  return result;
}

function validateDate(value: string | undefined, name: string): void {
  if (value !== undefined && (!ISO_DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)))) throw new Error(`${name} must be an ISO date (YYYY-MM-DD)`);
}

export function buildConnectivityPulse(
  input: ConnectivityInput,
  options: ConnectivityOptions & { fetchedAt: string; provenance?: Partial<Record<ConnectivitySeriesId, Provenance>> },
) {
  validateDate(options.from, "from");
  validateDate(options.to, "to");
  if (options.from && options.to && options.from > options.to) throw new Error("from must not be after to");
  const selected = options.series ? DEFINITIONS.filter(({ id }) => id === options.series) : DEFINITIONS;
  if (options.series && selected.length === 0) throw new Error("unknown connectivity series");

  const series = selected.map((definition) => {
    const rows = input[definition.id];
    const points = rows.map((row) => {
      if (!row || typeof row !== "object") throw new Error("invalid TDRA connectivity row");
      const serial = number(row.Statistics);
      return { date: excelSerialToIsoDate(serial), value: number(row[definition.field]) };
    }).sort((left, right) => left.date.localeCompare(right.date))
      .filter(({ date }) => (!options.from || date >= options.from) && (!options.to || date <= options.to));
    const duplicate = points.find((point, index) => index > 0 && point.date === points[index - 1]?.date);
    if (duplicate) throw new Error(`invalid TDRA connectivity row: duplicate date ${duplicate.date}`);
    return {
      id: definition.id,
      title: { en: definition.titleEn, ar: definition.titleAr },
      unit: definition.unit,
      points,
      latest: points.at(-1) ?? null,
      provenance: options.provenance?.[definition.id] ?? null,
    };
  });
  const dates = series.flatMap(({ points }) => points.map(({ date }) => date)).sort();
  return {
    kind: "uae_connectivity_pulse",
    scope: "United Arab Emirates",
    generatedAt: options.fetchedAt,
    dateRange: { from: dates[0] ?? null, to: dates.at(-1) ?? null },
    series,
    methodology: {
      compositeScore: false,
      treatment: "Each source-native TDRA series is normalized only into dated numeric observations and remains separate from the other units.",
    },
    limitations: [
      "Subscription counts are not unique people, users, households or devices; one person or organisation may hold multiple subscriptions.",
      "Per-100-inhabitants series depend on TDRA's source methodology and population denominator; they are not coverage, speed, quality, affordability or digital-inclusion measures.",
      "The three series preserve different source-native units and must not be added together or treated as a composite score.",
      "Changes in a series do not by themselves establish economic growth, service quality or causation.",
    ],
  } as const;
}
