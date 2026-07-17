import { describe, expect, it } from "bun:test";
import { buildTradeFlowRadar } from "../src/trade-flow.js";

describe("UAE Trade Flow Radar", () => {
  it("keeps export and re-export evidence separate while ranking the bounded sample", () => {
    const radar = buildTradeFlowRadar([
      {
        dataset: "export-coo-in-2023",
        flow: "export",
        upstreamTotal: 2,
        citation: "https://data.ajman.ae/export",
        license: "Ajman open data",
        dataQuality: { quality_score: 0.8 },
        fetchedAt: "2026-07-17T00:00:00Z",
        records: [
          { destinationen: "KUWAIT", destinationar: "الكويت", moten: "By Road", motar: "البر", productcode: 63019000, coomonth: "January" },
          { destinationen: "SUDAN", destinationar: "السودان", moten: "By Ship", motar: "البحر", productcode: 27101913, coomonth: "January" },
        ],
      },
      {
        dataset: "coo-re-export-2023-part-1",
        flow: "re_export",
        upstreamTotal: 3,
        citation: "https://data.ajman.ae/re-export",
        license: "Ajman open data",
        dataQuality: { quality_score: 0.9 },
        fetchedAt: "2026-07-17T00:00:00Z",
        records: [
          { destinationen: "QATAR", destinationar: "قطر", moten: "By Road", motar: "البر", productcode: 61130000, origincountryname: "ايطاليا", coomonth: "June" },
          { destinationen: "QATAR", destinationar: "قطر", moten: "By Road", motar: "البر", productcode: 61130000, origincountryname: "الهند", coomonth: "June" },
        ],
      },
    ], { citation: "https://data.ajman.ae", fetchedAt: "2026-07-17T00:00:00Z" });

    expect(radar.kind).toBe("ajman_2023_trade_flow_evidence");
    expect(radar.scope).toMatchObject({ sampledRecords: 4, upstreamRecords: 5, completePopulation: false });
    expect(radar.flows.export.destinations[0]).toMatchObject({ nameEn: "KUWAIT", records: 1 });
    expect(radar.flows.export).toMatchObject({ upstreamRecords: 2, coverageRatio: 1 });
    expect(radar.flows.re_export.destinations[0]).toMatchObject({ nameEn: "QATAR", records: 2, sharePercent: 100 });
    expect(radar.flows.re_export).toMatchObject({ upstreamRecords: 3, coverageRatio: 0.666667 });
    expect(radar.flows.re_export.origins[0].records).toBe(1);
    expect(radar.methodology.unit).toBe("certificate_of_origin_line_record");
    expect(radar.evidence).toMatchObject({ qualityScore: 0.85, citations: ["https://data.ajman.ae/export", "https://data.ajman.ae/re-export"] });
    expect(radar.citations).toEqual(radar.evidence.citations);
    expect(radar.scope.datasets[0]).toMatchObject({ license: "Ajman open data", dataQuality: { quality_score: 0.8 }, lineage: expect.any(Array) });
    expect(radar.limitations.join(" ")).toContain("not trade value");
  });
});
