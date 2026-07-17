type Row = Record<string, unknown>;

const number = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export interface TaxServiceReportOptions {
  citation: string;
  fetchedAt: string;
}

export function buildTaxServiceReport(rows: Row[], options: TaxServiceReportOptions) {
  const totalRow = rows.find((row) => String(row.Service_Name_EN ?? "").trim().toLowerCase() === "grand total");
  if (!totalRow) throw new Error("FTA annual table is missing its official Grand Total row");

  const quarters = { Q1: number(totalRow.Q1), Q2: number(totalRow.Q2), Q3: number(totalRow.Q3), Q4: number(totalRow.Q4) };
  const services = rows
    .filter((row) => row !== totalRow && String(row.Service_Name_EN ?? "").trim())
    .map((row) => ({
      nameEn: String(row.Service_Name_EN ?? "").trim(),
      nameAr: String(row.Service_Name_AR ?? "").trim(),
      quarters: { Q1: number(row.Q1), Q2: number(row.Q2), Q3: number(row.Q3), Q4: number(row.Q4) },
      total: number(row["Grand Total"]),
    }))
    .sort((left, right) => right.total - left.total);
  const peak = Object.entries(quarters).sort((left, right) => right[1] - left[1])[0]!;

  return {
    kind: "fta_service_activity_2025",
    period: "2025",
    officialTotal: number(totalRow["Grand Total"]),
    quarters,
    peakQuarter: { quarter: peak[0], count: peak[1] },
    topService: services[0] ?? null,
    services,
    source: { sourceId: "fta_service_activity_2025", citation: options.citation, fetchedAt: options.fetchedAt },
    methodology: {
      total: "The value is read from the FTA-published Grand Total row; service rows are not re-summed.",
      scope: "Only the first 10-row annual table in sheet 1 is read. A differently structured monthly table embedded below it is excluded.",
    },
    limitations: [
      "These are FTA-published service activity counts, not tax revenue, taxpayer totals, company counts, or an economic-growth measure.",
      "Service categories can represent registrations, amendments, reconsiderations, deregistrations, and refund requests; interpret each category independently.",
      "No causal or economic-growth conclusion is made from changes between quarters.",
    ],
  };
}
