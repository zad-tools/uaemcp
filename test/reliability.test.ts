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

  it("stores snapshots and returns record and schema diffs", () => {
    store = new ReliabilityStore(":memory:");
    const first = store.saveSnapshot("s", "d", [{ id: 1, name: "A" }], "2026-01-01T00:00:00Z") as { id: number };
    const second = store.saveSnapshot("s", "d", [{ id: 1, name: "A", value: 2 }, { id: 2, name: "B", value: 3 }], "2026-01-02T00:00:00Z") as { id: number };
    const diff = store.diffSnapshots(first.id, second.id) as { recordDiff: { added: number; removed: number }; schemaDiff: { addedFields: string[] }; changed: boolean };
    expect(diff.changed).toBe(true);
    expect(diff.recordDiff).toMatchObject({ added: 2, removed: 1 });
    expect(diff.schemaDiff.addedFields).toContain("value");
  });
});
