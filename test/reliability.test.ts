import { afterEach, describe, expect, it } from "bun:test";
import { ReliabilityStore } from "../src/reliability.js";

let store: ReliabilityStore | null = null;
afterEach(() => store?.close());

describe("reliability store", () => {
  it("records health history and calculates uptime", () => {
    store = new ReliabilityStore(":memory:");
    store.recordHealth({ source_id: "s", status: "ok", message: "ok", checked_url: "https://x", record_count: 1, latency_ms: 20 }, "2026-01-01T00:00:00Z");
    store.recordHealth({ source_id: "s", status: "down", message: "down", checked_url: "https://x", record_count: 0, latency_ms: 100 }, "2026-01-02T00:00:00Z");
    const history = store.healthHistory("s") as { summary: { uptimeRatio: number; samples: number } };
    expect(history.summary).toMatchObject({ uptimeRatio: 0.5, samples: 2 });
  });

  it("builds an observatory report and derives bounded incidents from status transitions", () => {
    store = new ReliabilityStore(":memory:");
    store.recordHealth({ source_id: "alpha", status: "ok", message: "healthy", checked_url: "https://a", record_count: 2, latency_ms: 20 }, "2026-01-01T00:00:00Z");
    store.recordHealth({ source_id: "alpha", status: "down", message: "timeout", checked_url: "https://a", record_count: 0, latency_ms: 5000 }, "2026-01-02T00:00:00Z");
    store.recordHealth({ source_id: "alpha", status: "ok", message: "recovered", checked_url: "https://a", record_count: 2, latency_ms: 30 }, "2026-01-03T00:00:00Z");
    store.recordHealth({ source_id: "beta", status: "down", message: "blocked", checked_url: "https://b", record_count: 0, latency_ms: 80 }, "2026-01-03T00:00:00Z");

    expect(store.observatoryReport(["alpha", "beta", "empty"], "2026-01-04T00:00:00Z", 172_800_000)).toMatchObject({
      generatedAt: "2026-01-04T00:00:00Z",
      monitoredSources: 3,
      observedSources: 2,
      currentStatus: { ok: 1, partial: 0, down: 1, unknown: 1 },
      observedReachabilityRatio: 0.5,
      latencyP95Ms: 5000,
      observationFreshness: { current: 2, stale: 0, unknown: 1 },
      failureReasons: { blocked: 1 },
      incidents: { open: 1, recovered: 1, total: 2 },
      sources: [
        expect.objectContaining({ sourceId: "alpha", freshness: { status: "current", ageMs: 86_400_000 } }),
        expect.objectContaining({ sourceId: "beta", freshness: { status: "current", ageMs: 86_400_000 } }),
        expect.objectContaining({ sourceId: "empty", freshness: { status: "unknown", ageMs: null } }),
      ],
    });
    expect(store.incidents("alpha", 10)).toEqual([
      expect.objectContaining({ sourceId: "alpha", status: "recovered", startedAt: "2026-01-02T00:00:00Z", endedAt: "2026-01-03T00:00:00Z" }),
    ]);
  });

  it("stores snapshots and returns record and schema diffs", () => {
    store = new ReliabilityStore(":memory:");
    const first = store.saveSnapshot("s", "d", [{ id: 1, name: "A" }], "2026-01-01T00:00:00Z") as { id: number };
    const second = store.saveSnapshot("s", "d", [{ id: 1, name: "A", value: 2 }, { id: 2, name: "B", value: 3 }], "2026-01-02T00:00:00Z") as { id: number };
    const diff = store.diffSnapshots(first.id, second.id) as { recordDiff: { added: number; removed: number }; schemaDiff: { addedFields: string[] }; changed: boolean };
    expect(diff.changed).toBe(true);
    expect(diff.recordDiff).toMatchObject({ added: 2, removed: 1 });
    expect(diff.schemaDiff.addedFields).toContain("value");
  });

  it("deduplicates unchanged snapshots and enforces retention", () => {
    store = new ReliabilityStore(":memory:");
    const first = store.saveSnapshot("source", null, [{ value: 1 }], "2026-01-01T00:00:00Z") as { id: number };
    const duplicate = store.saveSnapshot("source", null, [{ value: 1 }], "2026-01-02T00:00:00Z");
    expect(duplicate).toMatchObject({ id: first.id, created: false, unchanged: true });
    for (let value = 2; value <= 35; value += 1) {
      store.saveSnapshot("source", null, [{ value }], `2026-02-${String(Math.min(value, 28)).padStart(2, "0")}T00:00:00Z`);
    }
    expect(store.listSnapshots("source", null, 100)).toHaveLength(30);
  });
});
