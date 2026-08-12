/**
 * Open Emirates Pro: quota gate + usage metering against the SaaSpress control
 * plane on zadstack.com.
 *
 * Design:
 * - Entitlements are cached per subject for 60s, so steady traffic costs ~one
 *   control-plane roundtrip per customer per minute, not per request.
 * - Usage is counted locally in SQLite (survives restarts) and flushed to
 *   SaaSpress in batches through a persisted batch ledger — every batch row has
 *   a stable id used as the idempotency key, so a crash between send and ack can
 *   only re-send the same batch, never double-bill.
 * - Unconfigured environment (no SAASPRESS_* / key secret) disables the whole
 *   layer: the server behaves exactly as the free public deployment.
 */

import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  decideAccess,
  ingestUsage,
  resolveEntitlement,
  saaspressConfig,
  type EntitlementResult,
  type SaaSpressConfig,
} from "./saaspress-client.js";
import { verifyProKey } from "./pro-keys.js";

export interface ProSettings {
  saaspress: SaaSpressConfig;
  keySecret: string;
  metric: string;
  databasePath: string;
}

export function proSettings(env: Record<string, string | undefined> = process.env): ProSettings | null {
  const saaspress = saaspressConfig(env);
  const keySecret = env.UAEMCP_PRO_KEY_SECRET || "";
  if (!saaspress || !keySecret) return null;
  return {
    saaspress,
    keySecret,
    metric: env.UAEMCP_PRO_METRIC || "mcp_calls",
    databasePath: env.UAEMCP_PRO_DATABASE_PATH || "data/pro-usage.sqlite",
  };
}

export type GateResult =
  | { kind: "free" }
  | { kind: "invalid_key" }
  | { kind: "denied"; reason: string; used: number }
  | { kind: "allowed"; subject: string; used: number; limit: number };

interface CacheEntry { result: EntitlementResult; at: number }

const ENTITLEMENT_TTL_MS = 60_000;
const FLUSH_INTERVAL_MS = 60_000;

function monthKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export class ProMetering {
  private readonly db: Database;
  private readonly cache = new Map<string, CacheEntry>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly settings: ProSettings) {
    mkdirSync(dirname(settings.databasePath), { recursive: true });
    this.db = new Database(settings.databasePath);
    this.db.run(`CREATE TABLE IF NOT EXISTS usage (
      subject TEXT NOT NULL, month TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0, batched INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (subject, month))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL, month TEXT NOT NULL, qty INTEGER NOT NULL,
      acked INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL)`);
  }

  /** Verify the key, resolve the entitlement (cached), and decide the call. */
  async gate(apiKey: string | null): Promise<GateResult> {
    if (!apiKey) return { kind: "free" };
    const subject = await verifyProKey(apiKey, this.settings.keySecret);
    if (!subject) return { kind: "invalid_key" };

    const entitlement = await this.entitlementFor(subject);
    const used = this.usedThisMonth(subject);
    const decision = decideAccess(entitlement, {
      metric: this.settings.metric, currentUsage: used, quantity: 1,
    });
    if (!decision.allowed) return { kind: "denied", reason: decision.reason, used };
    const limit = entitlement.found ? Number(entitlement.entitlement.limits?.[this.settings.metric] ?? 0) : 0;
    return { kind: "allowed", subject, used, limit };
  }

  /** Count one served call. Cheap local write; flushed to SaaSpress in batches. */
  record(subject: string): void {
    this.db.run(
      `INSERT INTO usage (subject, month, used) VALUES (?1, ?2, 1)
       ON CONFLICT(subject, month) DO UPDATE SET used = used + 1`,
      [subject, monthKey()],
    );
  }

  usedThisMonth(subject: string): number {
    const row = this.db.query<{ used: number }, [string, string]>(
      "SELECT used FROM usage WHERE subject = ?1 AND month = ?2",
    ).get(subject, monthKey());
    return row?.used ?? 0;
  }

  private async entitlementFor(subject: string): Promise<EntitlementResult> {
    const cached = this.cache.get(subject);
    if (cached && Date.now() - cached.at < ENTITLEMENT_TTL_MS) return cached.result;
    const result = await resolveEntitlement(this.settings.saaspress, {
      subjectType: "user", subjectExternalId: subject,
    });
    this.cache.set(subject, { result, at: Date.now() });
    return result;
  }

  /** Move new local counts into ledger batches, then report unacked batches. */
  async flush(): Promise<{ sent: number; failed: number }> {
    const pending = this.db.query<{ subject: string; month: string; used: number; batched: number }, []>(
      "SELECT subject, month, used, batched FROM usage WHERE used > batched",
    ).all();
    for (const row of pending) {
      const qty = row.used - row.batched;
      this.db.run("INSERT INTO batches (subject, month, qty, created) VALUES (?1, ?2, ?3, ?4)",
        [row.subject, row.month, qty, Date.now()]);
      this.db.run("UPDATE usage SET batched = ?1 WHERE subject = ?2 AND month = ?3",
        [row.used, row.subject, row.month]);
    }

    let sent = 0, failed = 0;
    const unacked = this.db.query<{ id: number; subject: string; month: string; qty: number }, []>(
      "SELECT id, subject, month, qty FROM batches WHERE acked = 0 ORDER BY id LIMIT 50",
    ).all();
    for (const batch of unacked) {
      try {
        await ingestUsage(this.settings.saaspress, {
          id: `evt_oe_batch_${batch.id}`,
          appId: this.settings.saaspress.appId,
          subjectId: batch.subject,
          metric: this.settings.metric,
          quantity: batch.qty,
          idempotencyKey: `oe:batch:${batch.id}`,
          occurredAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
        });
        this.db.run("UPDATE batches SET acked = 1 WHERE id = ?1", [batch.id]);
        sent += 1;
      } catch {
        failed += 1; // stays unacked; retried with the same idempotency key next flush
      }
    }
    return { sent, failed };
  }

  startFlusher(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => { void this.flush(); }, FLUSH_INTERVAL_MS);
  }

  stop(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
    this.db.close();
  }
}

/** Singleton wired from env; null when the pro layer is not configured. */
let instance: ProMetering | null | undefined;
export function proMetering(): ProMetering | null {
  if (instance !== undefined) return instance;
  const settings = proSettings();
  instance = settings ? new ProMetering(settings) : null;
  if (instance) instance.startFlusher();
  return instance;
}

/** Test hook: reset the singleton. */
export function resetProMetering(): void {
  if (instance) instance.stop();
  instance = undefined;
}
