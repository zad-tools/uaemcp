import { describe, expect, it, mock } from "bun:test";

// Mock the network layer so aggregation is testable offline.
const mockFetch = mock();
mock.module("../src/connectors.js", () => ({ fetchRecords: mockFetch }));

const { buildMarketSnapshot } = await import("../src/snapshot.js");

describe("buildMarketSnapshot", () => {
  it("aggregates by emirate / area / product and cites the source", async () => {
    mockFetch.mockResolvedValue([
      { EmirateNameEN: "Dubai", AreaNameEN: "Al Quoz", Products: [{ ProductNameEN: "Steel" }] },
      { EmirateNameEN: "Dubai", AreaNameEN: "Al Quoz", Products: [{ ProductNameEN: "Steel" }] },
      { EmirateNameEN: "Abu Dhabi", AreaNameEN: "Musaffah", Products: [] },
    ]);

    const out = await buildMarketSnapshot("industry", 10);

    expect(out.sample_size).toBe(3);
    expect(out.emirates[0]).toEqual({ name: "Dubai", count: 2 });
    expect(out.products).toContainEqual({ name: "Steel", count: 2 });
    expect(out.source.citation).toBeTruthy();
  });
});
