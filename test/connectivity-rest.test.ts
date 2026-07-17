import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

const values: Record<string, [string, number]> = {
  tdra_active_mobile_subscriptions_2025: ["Active Mobile Subscriptions[ii]", 24_278_380],
  tdra_broadband_per_100_2025: ["Broadband Internet Subscriptions per 100 inhabitants", 51.4],
  tdra_fixed_lines_per_100_2025: ["Fixed lines per 100 inhabitants", 20.4],
};

const fetcher = async (source: { id: string }) => {
  const [field, value] = values[source.id] ?? ["unknown", 0];
  return {
    records: [{ Statistics: 45992, [field]: value }], source_id: source.id, dataset: null, total: 1,
    fetched_at: "2026-07-18T00:00:00Z", citation: `https://tdra.gov.ae/${source.id}`,
    license: "TDRA Open Data Policy", fields: [], data_quality: { quality_score: 0.95 },
  } as any;
};

describe("TDRA Connectivity Pulse REST contract", () => {
  it("keeps the three source-native series and units separate", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/connectivity"), { fetchConnectivityRecords: fetcher as any });
    const body = await response?.json();
    expect(response?.status).toBe(200);
    expect(body.data).toMatchObject({ kind: "uae_connectivity_pulse" });
    expect(body.data.series).toHaveLength(3);
    expect(body.data.methodology).toMatchObject({ compositeScore: false });
    expect(body.meta).toMatchObject({ delivery: "live" });
  });

  it("accepts bounded date and series filters", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/connectivity?series=active_mobile_subscriptions&from=2025-12-01&to=2025-12-31"), { fetchConnectivityRecords: fetcher as any });
    const body = await response?.json();
    expect(response?.status).toBe(200);
    expect(body.data.series).toHaveLength(1);
    expect(body.meta.filters).toEqual({ series: "active_mobile_subscriptions", from: "2025-12-01", to: "2025-12-31" });
  });

  it("rejects unknown series, malformed dates and inverted ranges", async () => {
    for (const query of ["series=mobile", "from=2025-13-01", "from=2025-12-31&to=2025-01-01"]) {
      const response = await handleRest(new Request(`http://localhost/api/v1/connectivity?${query}`));
      expect(response?.status).toBe(422);
    }
  });
});
