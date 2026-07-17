import { describe, expect, it } from "bun:test";
import { ReliabilityStore } from "../src/reliability.js";
import { coverageIndicator, healthIndicator, industrialDistributionIndicator, listIndicators, stabilityIndicator } from "../src/indicators.js";
import { REGISTRY } from "../src/sources.js";

describe("explainable indicators", () => {
  it("publishes a bounded indicator catalog and honest coverage", () => {
    expect(listIndicators()).toHaveLength(4);
    expect(coverageIndicator()).toMatchObject({ indicator: "open_data_coverage", value: 21.95, dimensions: { live: 9, indexed: 41 } });
  });
  it("returns null health without observations and scores retained checks", () => {
    const store = new ReliabilityStore(":memory:"); const source = REGISTRY.get("moiat_industrial_licenses");
    expect(healthIndicator(store, [source]).value).toBeNull();
    store.recordHealth({ source_id: source.id, status: "ok", message: "ok", checked_url: source.base_url, record_count: 1, latency_ms: 10 });
    store.recordHealth({ source_id: source.id, status: "down", message: "down", checked_url: source.base_url, record_count: 0, latency_ms: 20 });
    expect(healthIndicator(store, [source]).value).toBe(50); store.close();
  });
  it("calculates stability and industrial distribution with limitations", () => {
    const source = REGISTRY.get("moiat_industrial_licenses");
    expect(stabilityIndicator(source, [{ recordCount: 10 }, { recordCount: 10 }]).value).toBe(100);
    const distribution = industrialDistributionIndicator(source, [{ EmirateNameEN: "Dubai" }, { EmirateNameAR: "دبي" }, {}]);
    expect(distribution).toMatchObject({ value: 2, dimensions: [{ id: "dubai", count: 2 }] });
    expect(distribution.limitations).toBeArray();
  });
});
