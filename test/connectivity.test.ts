import { describe, expect, it } from "bun:test";
import { buildConnectivityPulse, excelSerialToIsoDate } from "../src/connectivity.js";

const input = {
  active_mobile_subscriptions: [
    { Statistics: 40544, "Active Mobile Subscriptions[ii]": 11_053_369 },
    { Statistics: 40575, "Active Mobile Subscriptions[ii]": 11_100_000 },
  ],
  broadband_per_100_inhabitants: [
    { Statistics: 40544, "Broadband Internet Subscriptions per 100 inhabitants": 14.3 },
    { Statistics: 40575, "Broadband Internet Subscriptions per 100 inhabitants": 14.5 },
  ],
  fixed_lines_per_100_inhabitants: [
    { Statistics: 40544, "Fixed lines per 100 inhabitants": 30.5 },
    { Statistics: 40575, "Fixed lines per 100 inhabitants": 30.2 },
  ],
};

describe("TDRA connectivity domain", () => {
  it("converts source Excel dates without local-time drift", () => {
    expect(excelSerialToIsoDate(40544)).toBe("2011-01-01");
    expect(excelSerialToIsoDate(45992)).toBe("2025-12-01");
  });

  it("keeps three source-native series and their units separate", () => {
    const pulse = buildConnectivityPulse(input, {
      fetchedAt: "2026-07-18T00:00:00Z",
      provenance: {
        active_mobile_subscriptions: { sourceId: "mobile", citation: "https://example.test/mobile" },
        broadband_per_100_inhabitants: { sourceId: "broadband", citation: "https://example.test/broadband" },
        fixed_lines_per_100_inhabitants: { sourceId: "fixed", citation: "https://example.test/fixed" },
      },
    });

    expect(pulse.dateRange).toEqual({ from: "2011-01-01", to: "2011-02-01" });
    expect(pulse.series.map(({ id, unit, latest }) => ({ id, unit, latest }))).toEqual([
      { id: "active_mobile_subscriptions", unit: "subscriptions", latest: { date: "2011-02-01", value: 11_100_000 } },
      { id: "broadband_per_100_inhabitants", unit: "subscriptions_per_100_inhabitants", latest: { date: "2011-02-01", value: 14.5 } },
      { id: "fixed_lines_per_100_inhabitants", unit: "lines_per_100_inhabitants", latest: { date: "2011-02-01", value: 30.2 } },
    ]);
    expect(pulse.limitations.join(" ")).toContain("not unique people");
    expect(pulse.limitations.join(" ")).toContain("not coverage, speed, quality, affordability");
  });

  it("filters dates and one series without mutating source records", () => {
    const before = structuredClone(input);
    const pulse = buildConnectivityPulse(input, {
      fetchedAt: "x",
      series: "active_mobile_subscriptions",
      from: "2011-02-01",
      to: "2011-02-01",
    });
    expect(pulse.series).toHaveLength(1);
    expect(pulse.series[0]?.points).toEqual([{ date: "2011-02-01", value: 11_100_000 }]);
    expect(input).toEqual(before);
  });

  it("rejects invalid records and invalid ranges", () => {
    expect(() => buildConnectivityPulse({ ...input, active_mobile_subscriptions: [{ Statistics: "bad", "Active Mobile Subscriptions[ii]": 1 }] }, { fetchedAt: "x" })).toThrow("invalid TDRA connectivity row");
    expect(() => buildConnectivityPulse(input, { fetchedAt: "x", from: "2025-02-01", to: "2025-01-01" })).toThrow("from must not be after to");
  });
});
