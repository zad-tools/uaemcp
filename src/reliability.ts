import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SETTINGS } from "./config.js";
import type { HealthResult } from "./connectors.js";
import { inferSchema } from "./schema.js";
import { ValidationError } from "./errors.js";

type Rec = Record<string, unknown>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Rec).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export class ReliabilityStore {
  readonly db: Database;

  constructor(path = SETTINGS.databasePath) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS health_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        status TEXT NOT NULL,
        latency_ms INTEGER NOT NULL,
        record_count INTEGER NOT NULL,
        message TEXT NOT NULL,
        checked_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS health_source_time ON health_checks(source_id, checked_at DESC);
      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        dataset TEXT,
        records_json TEXT NOT NULL,
        schema_json TEXT NOT NULL,
        record_count INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        captured_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS snapshot_source_time ON snapshots(source_id, dataset, captured_at DESC);
    `);
  }

  recordHealth(result: HealthResult, checkedAt = new Date().toISOString()): void {
    this.db.transaction(() => {
      this.db.query(`INSERT INTO health_checks (source_id,status,latency_ms,record_count,message,checked_at) VALUES (?,?,?,?,?,?)`)
        .run(result.source_id, result.status, result.latency_ms, result.record_count, result.message, checkedAt);
      this.db.query(`DELETE FROM health_checks WHERE source_id=? AND id NOT IN (SELECT id FROM health_checks WHERE source_id=? ORDER BY checked_at DESC,id DESC LIMIT ?)`)
        .run(result.source_id, result.source_id, SETTINGS.healthRetention);
    })();
  }

  healthHistory(sourceId: string, limit = 100): Rec {
    const rows = this.db.query(`SELECT status,latency_ms,record_count,message,checked_at FROM health_checks WHERE source_id=? ORDER BY checked_at DESC LIMIT ?`).all(sourceId, limit) as Rec[];
    const ok = rows.filter((row) => row.status === "ok").length;
    const latencies = rows.map((row) => Number(row.latency_ms)).filter(Number.isFinite).sort((a, b) => a - b);
    const percentile = (p: number) => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] : null;
    return {
      sourceId,
      checks: rows,
      summary: {
        samples: rows.length,
        uptimeRatio: rows.length ? Number((ok / rows.length).toFixed(4)) : null,
        latencyP50Ms: percentile(0.5),
        latencyP95Ms: percentile(0.95),
        lastSuccessAt: rows.find((row) => row.status === "ok")?.checked_at ?? null,
        lastFailureAt: rows.find((row) => row.status === "down")?.checked_at ?? null,
      },
    };
  }

  saveSnapshot(sourceId: string, dataset: string | null, records: Rec[], capturedAt = new Date().toISOString()): Rec {
    const body = canonical(records);
    const schema = inferSchema(records);
    const hash = Bun.hash(body).toString(16);
    const previous = this.db.query(`SELECT id,captured_at FROM snapshots WHERE source_id=? AND dataset IS ? AND content_hash=? ORDER BY captured_at DESC LIMIT 1`).get(sourceId, dataset, hash) as Rec | null;
    if (previous) return { id: Number(previous.id), sourceId, dataset, recordCount: records.length, contentHash: hash, capturedAt: previous.captured_at, created: false, unchanged: true };
    let id = 0;
    this.db.transaction(() => {
      const result = this.db.query(`INSERT INTO snapshots (source_id,dataset,records_json,schema_json,record_count,content_hash,captured_at) VALUES (?,?,?,?,?,?,?)`)
        .run(sourceId, dataset, body, JSON.stringify(schema), records.length, hash, capturedAt);
      id = Number(result.lastInsertRowid);
      this.db.query(`DELETE FROM snapshots WHERE source_id=? AND dataset IS ? AND id NOT IN (SELECT id FROM snapshots WHERE source_id=? AND dataset IS ? ORDER BY captured_at DESC,id DESC LIMIT ?)`)
        .run(sourceId, dataset, sourceId, dataset, SETTINGS.snapshotRetention);
    })();
    return { id, sourceId, dataset, recordCount: records.length, contentHash: hash, capturedAt, created: true, unchanged: false };
  }

  listSnapshots(sourceId: string, dataset: string | null, limit = 20): Rec[] {
    return this.db.query(`SELECT id,source_id AS sourceId,dataset,record_count AS recordCount,content_hash AS contentHash,captured_at AS capturedAt FROM snapshots WHERE source_id=? AND dataset IS ? ORDER BY captured_at DESC LIMIT ?`).all(sourceId, dataset, limit) as Rec[];
  }

  diffSnapshots(fromId: number, toId: number): Rec {
    const load = (id: number) => this.db.query(`SELECT * FROM snapshots WHERE id=?`).get(id) as Rec | null;
    const from = load(fromId);
    const to = load(toId);
    if (!from || !to) throw new ValidationError("snapshot not found");
    const fromRecords = JSON.parse(String(from.records_json)) as Rec[];
    const toRecords = JSON.parse(String(to.records_json)) as Rec[];
    const before = new Set(fromRecords.map(canonical));
    const after = new Set(toRecords.map(canonical));
    const added = toRecords.filter((record) => !before.has(canonical(record)));
    const removed = fromRecords.filter((record) => !after.has(canonical(record)));
    const fromSchema = JSON.parse(String(from.schema_json)) as { fields: { name: string; type: string }[] };
    const toSchema = JSON.parse(String(to.schema_json)) as { fields: { name: string; type: string }[] };
    const beforeFields = new Map(fromSchema.fields.map((field) => [field.name, field.type]));
    const afterFields = new Map(toSchema.fields.map((field) => [field.name, field.type]));
    return {
      fromSnapshot: fromId,
      toSnapshot: toId,
      recordDiff: { added: added.length, removed: removed.length, addedRecords: added.slice(0, 20), removedRecords: removed.slice(0, 20) },
      schemaDiff: {
        addedFields: [...afterFields.keys()].filter((name) => !beforeFields.has(name)),
        removedFields: [...beforeFields.keys()].filter((name) => !afterFields.has(name)),
        changedFields: [...afterFields.entries()].filter(([name, type]) => beforeFields.has(name) && beforeFields.get(name) !== type).map(([name, type]) => ({ name, from: beforeFields.get(name), to: type })),
      },
      changed: String(from.content_hash) !== String(to.content_hash),
    };
  }

  close(): void {
    this.db.close();
  }
}

let shared: ReliabilityStore | null = null;
export function reliabilityStore(): ReliabilityStore {
  shared ??= new ReliabilityStore();
  return shared;
}
