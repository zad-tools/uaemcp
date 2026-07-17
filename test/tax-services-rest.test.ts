import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

describe("FTA service activity REST product", () => {
  it("returns a methodology-backed report from the bounded official table", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/tax-services"), {
      fetchIndustryRecords: async () => { throw new Error("unused"); },
      fetchTaxRecords: async () => ({
        records: [
          { Service_Name_EN: "VAT Registration", Service_Name_AR: "التسجيل", Q1: 1, Q2: 2, Q3: 3, Q4: 4, "Grand Total": 10 },
          { Service_Name_EN: "Grand Total", Service_Name_AR: "الإجمالي", Q1: 1, Q2: 2, Q3: 3, Q4: 4, "Grand Total": 10 },
        ],
        total: 2, citation: "https://tax.gov.ae/open-data", fetched_at: "2026-07-17T00:00:00Z",
        data_quality: { quality_score: 1 },
      } as never),
    });
    const body = await response!.json();
    expect(body.data).toMatchObject({ officialTotal: 10, peakQuarter: { quarter: "Q4", count: 4 } });
    expect(body.meta).toMatchObject({ source_id: "fta_service_activity_2025", returned_records: 2 });
  });
});
