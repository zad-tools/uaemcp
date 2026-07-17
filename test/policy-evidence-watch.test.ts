import { afterEach, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PolicyEvidenceStore, buildPolicyEvidenceSnapshot, diffPolicyEvidence } from "../src/policy-evidence-watch.js";

const temporaryPaths: string[] = [];
afterEach(() => {
  for (const path of temporaryPaths.splice(0)) if (existsSync(path)) rmSync(path, { recursive: true });
});

const snapshot = (capturedAt: string, sections: Array<{ id: string; title: string; text: string }>) => buildPolicyEvidenceSnapshot({
  sourceId: "icp_golden_residency",
  citation: "https://icp.gov.ae/golden-residency/",
  capturedAt,
  title: "Golden Residency requirements",
  sections,
});

describe("Policy Evidence Watch domain", () => {
  it("normalizes trusted text into deterministic immutable snapshots", () => {
    const first = snapshot("2026-07-17T00:00:00Z", [{ id: "entrepreneur", title: "Entrepreneur", text: "Official  requirement\n text" }]);
    const second = snapshot("2026-07-18T00:00:00Z", [{ id: "entrepreneur", title: "Entrepreneur", text: "Official requirement text" }]);

    expect(first.contentHash).toBe(second.contentHash);
    expect(first.sections[0]).toMatchObject({ excerpt: "Official requirement text", characterCount: 25 });
    expect(JSON.stringify(first)).not.toContain("Official  requirement");
    expect(first.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.sections)).toBe(true);
  });

  it("reports added, removed and modified section hashes without legal interpretation", () => {
    const before = snapshot("2026-07-17T00:00:00Z", [
      { id: "entrepreneur", title: "Entrepreneur", text: "Requirement A" },
      { id: "executive", title: "Executive", text: "Requirement B" },
    ]);
    const after = snapshot("2026-07-18T00:00:00Z", [
      { id: "entrepreneur", title: "Entrepreneur", text: "Requirement A updated" },
      { id: "student", title: "Student", text: "Requirement C" },
    ]);
    const change = diffPolicyEvidence(before, after);

    expect(change.status).toBe("changed");
    expect(change.changes.added).toEqual([{ id: "student", hash: after.sections[1]?.contentHash }]);
    expect(change.changes.removed).toEqual([{ id: "executive", hash: before.sections[1]?.contentHash }]);
    expect(change.changes.modified).toEqual([{
      id: "entrepreneur",
      beforeHash: before.sections[0]?.contentHash,
      afterHash: after.sections[0]?.contentHash,
    }]);
    expect(change.methodology).toMatchObject({ interpretation: "content_change_only", legalEffectDetermined: false, eligibilityDetermined: false });
    expect(change.limitations.join(" ")).toContain("does not determine");
  });

  it("returns unchanged for equivalent snapshots and rejects cross-source comparisons", () => {
    const before = snapshot("2026-07-17T00:00:00Z", [{ id: "one", title: "One", text: "Same" }]);
    const after = snapshot("2026-07-18T00:00:00Z", [{ id: "one", title: "One", text: " Same " }]);
    expect(diffPolicyEvidence(before, after)).toMatchObject({ status: "unchanged", changes: { added: [], removed: [], modified: [] } });
    const other = buildPolicyEvidenceSnapshot({
      sourceId: "other_source", citation: after.citation, capturedAt: after.capturedAt, title: after.title,
      sections: [{ id: "one", title: "One", text: "Same" }],
    });
    expect(() => diffPolicyEvidence(before, other)).toThrow("same source");
  });

  it("deduplicates snapshots in memory and optionally persists JSON across store instances", () => {
    const directory = mkdtempSync(join(tmpdir(), "uaemcp-policy-watch-"));
    temporaryPaths.push(directory);
    const path = join(directory, "policy-watch.json");
    const first = snapshot("2026-07-17T00:00:00Z", [{ id: "one", title: "One", text: "A" }]);
    const duplicate = snapshot("2026-07-18T00:00:00Z", [{ id: "one", title: "One", text: "A" }]);
    const changed = snapshot("2026-07-19T00:00:00Z", [{ id: "one", title: "One", text: "B" }]);
    const store = new PolicyEvidenceStore({ path, retentionPerSource: 2 });

    expect(store.save(first)).toMatchObject({ created: true, unchanged: false });
    expect(store.save(duplicate)).toMatchObject({ created: false, unchanged: true, contentHash: first.contentHash });
    expect(store.save(changed)).toMatchObject({ created: true, unchanged: false });
    expect(store.list("icp_golden_residency")).toHaveLength(2);

    const restored = new PolicyEvidenceStore({ path, retentionPerSource: 2 });
    expect(restored.list("icp_golden_residency").map(({ contentHash }) => contentHash)).toEqual([changed.contentHash, first.contentHash]);
    expect(restored.latestChange("icp_golden_residency")).toMatchObject({ status: "changed" });
  });

  it("persists bounded last-check observations including unavailable checks", () => {
    const directory = mkdtempSync(join(tmpdir(), "uaemcp-policy-observations-"));
    temporaryPaths.push(directory);
    const path = join(directory, "policy-watch.json");
    const store = new PolicyEvidenceStore({ path, retentionPerSource: 2 });
    store.recordObservation({ sourceId: "fta_legislation_index", checkedAt: "2026-07-17T00:00:00Z", status: "unavailable", changeType: "check_failed", beforeHash: null, afterHash: null, error: "upstream blocked" });
    store.recordObservation({ sourceId: "fta_legislation_index", checkedAt: "2026-07-18T00:00:00Z", status: "unchanged", changeType: "first_snapshot", beforeHash: null, afterHash: "a".repeat(64) });
    const restored = new PolicyEvidenceStore({ path, retentionPerSource: 2 });
    expect(restored.observations("fta_legislation_index", 2)).toEqual([
      expect.objectContaining({ status: "unchanged", changeType: "first_snapshot" }),
      expect.objectContaining({ status: "unavailable", error: "upstream blocked" }),
    ]);
  });
});
