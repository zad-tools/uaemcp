type Rec = Record<string, unknown>;

interface SnapshotSummary {
  id: number;
  recordCount: number;
  capturedAt: string;
  contentHash: string;
}

interface SnapshotDiff {
  fromSnapshot: number;
  toSnapshot: number;
  changed: boolean;
  recordDiff: { added: number; removed: number; addedRecords: Rec[]; removedRecords: Rec[] };
  schemaDiff: { addedFields: string[]; removedFields: string[]; changedFields: Rec[] };
}

const LIMITATIONS = [
  "At least two different retained samples are required to report a change.",
  "A sample change is not proof of industrial growth, closure, production change, or economic impact.",
  "The upstream source does not currently prove full-population coverage or stable ordering.",
  "Unchanged scheduled checks are deduplicated and do not create additional Change Points.",
];

export function buildIndustrialChangeReport(rawSnapshots: Rec[], rawDiff?: Rec) {
  const diff = rawDiff as unknown as SnapshotDiff | undefined;
  const snapshots = rawSnapshots.map((item) => ({
    id: Number(item.id), recordCount: Number(item.recordCount), capturedAt: String(item.capturedAt), contentHash: String(item.contentHash),
  })).sort((left, right) => right.capturedAt.localeCompare(left.capturedAt)) as SnapshotSummary[];
  const latest = snapshots[0];
  const baseline = latest ? { snapshotId: latest.id, recordCount: latest.recordCount, capturedAt: latest.capturedAt, contentHash: latest.contentHash } : null;
  const methodology = {
    claim: "bounded_sample_change",
    retentionPolicy: "changed_content_only",
    comparison: "two most recent retained Change Points",
  };

  if (snapshots.length < 2 || !diff) {
    return {
      status: "insufficient_history",
      generatedAt: new Date().toISOString(),
      changePoints: snapshots.length,
      baseline,
      change: null,
      methodology,
      limitations: [...LIMITATIONS],
    };
  }

  const newest = snapshots[0];
  const previous = snapshots[1];
  const delta = newest.recordCount - previous.recordCount;
  const elapsedMs = Date.parse(newest.capturedAt) - Date.parse(previous.capturedAt);
  const schemaChanged = diff.schemaDiff.addedFields.length > 0 || diff.schemaDiff.removedFields.length > 0 || diff.schemaDiff.changedFields.length > 0;
  return {
    status: diff.changed ? "change_detected" : "no_change_detected",
    generatedAt: new Date().toISOString(),
    changePoints: snapshots.length,
    baseline,
    change: {
      fromSnapshot: diff.fromSnapshot,
      toSnapshot: diff.toSnapshot,
      fromCapturedAt: previous.capturedAt,
      toCapturedAt: newest.capturedAt,
      elapsedDays: Number.isFinite(elapsedMs) ? Number((elapsedMs / 86_400_000).toFixed(2)) : null,
      recordCountBefore: previous.recordCount,
      recordCountAfter: newest.recordCount,
      recordCountDelta: delta,
      recordCountDeltaPercent: previous.recordCount ? Number(((delta / previous.recordCount) * 100).toFixed(2)) : null,
      addedRecords: diff.recordDiff.added,
      removedRecords: diff.recordDiff.removed,
      schemaChanged,
      schemaDiff: diff.schemaDiff,
      evidence: { addedRecords: diff.recordDiff.addedRecords, removedRecords: diff.recordDiff.removedRecords },
    },
    methodology,
    limitations: LIMITATIONS.slice(1),
  };
}
