import { describe, expect, it } from "bun:test";
import { PolicyEvidenceStore } from "../src/policy-evidence-watch.js";
import { POLICY_WATCH_SOURCES, checkPolicyEvidenceWatch, parsePolicyEvidenceHtml, policyEvidenceWatchReport } from "../src/policy-watch-service.js";

const page = (value: string) => `<!doctype html><html><head><title>Official page</title><script>ignored secret</script></head><body><nav>menu</nav><h1>Policy catalogue</h1><p>${value}</p><h2>Requirements</h2><div>Official requirement text.</div><footer>footer</footer></body></html>`;

describe("Policy Evidence Watch service", () => {
  it("exposes only the five audited allowlisted official sources", () => {
    expect(POLICY_WATCH_SOURCES.map(({ id }) => id)).toEqual([
      "uae_legislation_catalogue",
      "fta_legislation_index",
      "mohre_resolutions_circulars",
      "icp_policy_announcements",
      "uae_cabinet_news",
    ]);
    expect(POLICY_WATCH_SOURCES.every(({ citation }) => citation.startsWith("https://"))).toBe(true);
    expect(Object.isFrozen(POLICY_WATCH_SOURCES)).toBe(true);
  });

  it("parses bounded headings and excludes executable or navigation HTML", () => {
    const sections = parsePolicyEvidenceHtml(page("Published content"));
    expect(sections.map(({ title }) => title)).toEqual(["Policy catalogue", "Requirements"]);
    expect(sections[0]?.text).toContain("Published content");
    expect(sections.map(({ text }) => text).join(" ")).not.toContain("ignored secret");
    expect(sections.map(({ text }) => text).join(" ")).not.toContain("menu");
  });

  it("checks selected sources concurrently and records an honest first baseline", async () => {
    const store = new PolicyEvidenceStore();
    let active = 0;
    let maximum = 0;
    const getText = async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return page("Initial published content");
    };
    const report = await checkPolicyEvidenceWatch(
      ["uae_legislation_catalogue", "fta_legislation_index"],
      { getText, store, generatedAt: "2026-07-17T00:00:00Z" },
    );

    expect(maximum).toBe(2);
    expect(report.summary).toEqual({ requested: 2, checked: 2, baseline: 2, changed: 0, unchanged: 2, unavailable: 0 });
    expect(report.sources.every(({ status }) => status === "unchanged")).toBe(true);
    expect(report.changes.every(({ changeType }) => changeType === "first_snapshot")).toBe(true);
    expect(report.limitations.map(({ en }) => en).join(" ")).toContain("not proof of a legal");
  });

  it("distinguishes changed, unchanged and unavailable; a failed fetch is never unchanged", async () => {
    const store = new PolicyEvidenceStore();
    const ids = ["uae_legislation_catalogue", "fta_legislation_index", "icp_policy_announcements"] as const;
    await checkPolicyEvidenceWatch(ids, { getText: async () => page("Version one"), store, generatedAt: "2026-07-17T00:00:00Z" });
    const report = await checkPolicyEvidenceWatch(ids, {
      getText: async (url) => {
        if (url.includes("ica_media")) throw new Error("upstream blocked");
        return page(url.includes("Legislation.aspx") ? "Version one" : "Version two");
      },
      store,
      generatedAt: "2026-07-18T00:00:00Z",
    });

    expect(report.summary).toEqual({ requested: 3, checked: 2, baseline: 0, changed: 1, unchanged: 1, unavailable: 1 });
    expect(report.sources.map(({ status }) => status)).toEqual(["changed", "unchanged", "unavailable"]);
    expect(report.changes.map(({ changeType }) => changeType)).toEqual(["content_changed", "unchanged", "check_failed"]);
    expect(report.changes[2]).toMatchObject({ changeType: "check_failed", beforeHash: expect.any(String), afterHash: null });
  });

  it("rejects empty, duplicate, excessive and non-allowlisted source selections before fetching", async () => {
    let calls = 0;
    const getText = async () => { calls += 1; return page("content"); };
    const store = new PolicyEvidenceStore();
    await expect(checkPolicyEvidenceWatch([], { getText, store })).rejects.toThrow("1-5");
    await expect(checkPolicyEvidenceWatch(["unknown"], { getText, store })).rejects.toThrow("allowlisted");
    await expect(checkPolicyEvidenceWatch(["uae_cabinet_news", "uae_cabinet_news"], { getText, store })).rejects.toThrow("unique");
    expect(calls).toBe(0);
  });

  it("retains hashes and bounded excerpts rather than full fetched page text", async () => {
    const store = new PolicyEvidenceStore();
    const longText = "x".repeat(2_000);
    await checkPolicyEvidenceWatch(["uae_cabinet_news"], { getText: async () => page(longText), store, generatedAt: "2026-07-17T00:00:00Z" });
    const retained = store.list("uae_cabinet_news")[0]!;
    expect(retained.sections[0]?.excerpt.length).toBeLessThanOrEqual(240);
    expect(retained.sections[0]).not.toHaveProperty("text");
    expect(JSON.stringify(retained)).not.toContain(longText);
  });

  it("rebuilds the public report from retained checks without hidden upstream work", async () => {
    const store = new PolicyEvidenceStore();
    await checkPolicyEvidenceWatch(["fta_legislation_index"], { getText: async () => page("Published"), store, generatedAt: "2026-07-17T00:00:00Z" });
    const report = policyEvidenceWatchReport(store, "2026-07-18T00:00:00Z");
    expect(report.sources.find(({ id }) => id === "fta_legislation_index")).toMatchObject({ status: "unchanged", latestSnapshotAt: "2026-07-17T00:00:00Z" });
    expect(report.sources.find(({ id }) => id === "uae_cabinet_news")).toMatchObject({ status: "never_checked", checkedAt: null });
    expect(report.changes).toHaveLength(1);
  });
});
