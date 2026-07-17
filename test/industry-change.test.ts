import { describe, expect, it } from "bun:test";
import { buildIndustrialChangeReport } from "../src/industry-change.js";

describe("Industrial Change Report", () => {
  it("states that history is insufficient when only a baseline exists", () => {
    const report = buildIndustrialChangeReport([
      { id: 7, recordCount: 10, capturedAt: "2026-07-17T00:00:00Z", contentHash: "aaa" },
    ]);
    expect(report).toMatchObject({ status: "insufficient_history", changePoints: 1, baseline: { snapshotId: 7, recordCount: 10 } });
    expect(report.change).toBeNull();
    expect(report.limitations).toContain("At least two different retained samples are required to report a change.");
  });

  it("summarizes the latest bounded sample change without calling it growth", () => {
    const snapshots = [
      { id: 2, recordCount: 12, capturedAt: "2026-07-18T00:00:00Z", contentHash: "bbb" },
      { id: 1, recordCount: 10, capturedAt: "2026-07-17T00:00:00Z", contentHash: "aaa" },
    ];
    const report = buildIndustrialChangeReport(snapshots, {
      fromSnapshot: 1, toSnapshot: 2, changed: true,
      recordDiff: { added: 3, removed: 1, addedRecords: [], removedRecords: [] },
      schemaDiff: { addedFields: ["Activity"], removedFields: [], changedFields: [] },
    });
    expect(report).toMatchObject({
      status: "change_detected", changePoints: 2,
      change: { fromSnapshot: 1, toSnapshot: 2, recordCountBefore: 10, recordCountAfter: 12, recordCountDelta: 2, addedRecords: 3, removedRecords: 1, schemaChanged: true },
    });
    expect(report.methodology.claim).toBe("bounded_sample_change");
  });
});
