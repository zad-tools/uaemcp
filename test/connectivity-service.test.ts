import { describe, expect, it } from "bun:test";
import { loadConnectivityPulse } from "../src/connectivity-service.js";

const fields = {
  tdra_active_mobile_subscriptions_2025: ["Active Mobile Subscriptions[ii]", 24_278_380],
  tdra_broadband_per_100_2025: ["Broadband Internet Subscriptions per 100 inhabitants", 51.4],
  tdra_fixed_lines_per_100_2025: ["Fixed lines per 100 inhabitants", 20.4],
} as const;

describe("TDRA connectivity service", () => {
  it("loads all official workbooks concurrently with per-source provenance", async () => {
    const calls: string[] = [];
    const loaded = await loadConnectivityPulse(async (source) => {
      calls.push(source.id);
      const [field, value] = fields[source.id as keyof typeof fields];
      return { records: [{ Statistics: 45992, [field]: value }], source_id: source.id, fetched_at: "2026-07-18T00:00:00Z", citation: source.docs_url, license: source.license, dataset: null, total: 1, fields: [], data_quality: { quality_score: 1 } } as any;
    });
    expect(new Set(calls)).toEqual(new Set(Object.keys(fields)));
    expect(loaded.data.series).toHaveLength(3);
    expect(loaded.data.series[0]?.provenance?.sourceId).toBe("tdra_active_mobile_subscriptions_2025");
    expect(loaded.meta).toMatchObject({ delivery: "live", partial: false, source_ids: Object.keys(fields) });
  });

  it("falls back to the verified snapshot when any workbook is unavailable", async () => {
    const loaded = await loadConnectivityPulse(async () => { throw new Error("blocked"); }, { series: "fixed_lines_per_100_inhabitants" });
    expect(loaded.data.series).toHaveLength(1);
    expect(loaded.data.series[0]?.latest).toEqual({ date: "2025-12-01", value: 20.4 });
    expect(loaded.meta).toMatchObject({ delivery: "verified_snapshot", partial: true, upstream_error: "blocked" });
    if (loaded.meta.delivery !== "verified_snapshot") throw new Error("expected verified snapshot");
    expect(loaded.meta.sha256).toHaveProperty("tdra_fixed_lines_per_100_2025");
  });
});
