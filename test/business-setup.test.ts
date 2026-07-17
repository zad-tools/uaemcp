import { describe, expect, it } from "bun:test";
import { BUSINESS_EMIRATES, businessSetupCatalogue, routeBusinessSetup } from "../src/business-setup.js";

describe("UAE Business Setup Navigator", () => {
  it("covers all seven emirates with official mainland authorities", () => {
    const catalogue = businessSetupCatalogue();
    expect(BUSINESS_EMIRATES).toHaveLength(7);
    expect(catalogue.mainlandAuthorities).toHaveLength(7);
    expect(catalogue.mainlandAuthorities.every((item) => item.officialUrl.startsWith("https://"))).toBe(true);
  });

  it("routes mainland and free-zone paths without pretending to choose a licence", () => {
    const mainland = routeBusinessSetup({ emirate: "dubai", setupType: "mainland", activitySector: "technology" });
    expect(mainland.primaryRoute.url).toContain("invest.dubai.ae");
    expect(mainland.primaryRoute.kind).toBe("mainland_authority");
    expect(mainland.stored).toBe(false);
    const freeZone = routeBusinessSetup({ emirate: "fujairah", setupType: "free_zone" });
    expect(freeZone.primaryRoute.url).toContain("u.ae/en/information-and-services/business/doing-business-in-free-zones");
    expect(freeZone.caveats.length).toBeGreaterThan(0);
  });

  it("returns both official paths when the founder is unsure", () => {
    const result = routeBusinessSetup({ emirate: "abu_dhabi", setupType: "unsure" });
    expect(result.alternatives).toHaveLength(2);
    expect(result.decision).toBe("routing_only");
  });
});
