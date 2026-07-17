import { SETTINGS } from "./config.js";
import { fetchResult } from "./connectors.js";
import { reliabilityStore } from "./reliability.js";
import { REGISTRY } from "./sources.js";

interface Target { sourceId: string; dataset: string | null }
interface RunResult { target: string; ok: boolean; snapshot?: Record<string, unknown>; error?: string }

function parseTargets(values = SETTINGS.snapshotTargets): Target[] {
  return values.map((value) => {
    const [sourceId, ...dataset] = value.split("@");
    return { sourceId: sourceId.trim(), dataset: dataset.join("@").trim() || null };
  }).filter((target) => target.sourceId);
}

class SnapshotScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private lastStartedAt: string | null = null;
  private lastFinishedAt: string | null = null;
  private lastResults: RunResult[] = [];

  status(): Record<string, unknown> {
    return {
      enabled: SETTINGS.snapshotIntervalMinutes > 0 && parseTargets().length > 0,
      running: this.running,
      intervalMinutes: SETTINGS.snapshotIntervalMinutes,
      targets: parseTargets().map((target) => target.dataset ? `${target.sourceId}@${target.dataset}` : target.sourceId),
      snapshotLimit: SETTINGS.snapshotLimit,
      retentionPerDataset: SETTINGS.snapshotRetention,
      lastStartedAt: this.lastStartedAt,
      lastFinishedAt: this.lastFinishedAt,
      lastResults: this.lastResults,
    };
  }

  async runNow(): Promise<RunResult[]> {
    if (this.running) return this.lastResults;
    this.running = true;
    this.lastStartedAt = new Date().toISOString();
    try {
      this.lastResults = await Promise.all(parseTargets().map(async (target): Promise<RunResult> => {
        const label = target.dataset ? `${target.sourceId}@${target.dataset}` : target.sourceId;
        try {
          const source = REGISTRY.get(target.sourceId);
          if (source.access_status !== "live") throw new Error(`source is ${source.access_status}, not live`);
          const result = await fetchResult(source, { dataset: target.dataset ?? undefined, limit: Math.max(1, Math.min(SETTINGS.snapshotLimit, 1000)) });
          return { target: label, ok: true, snapshot: reliabilityStore().saveSnapshot(source.id, target.dataset, result.records) };
        } catch (error) {
          return { target: label, ok: false, error: error instanceof Error ? error.message : String(error) };
        }
      }));
      return this.lastResults;
    } finally {
      this.running = false;
      this.lastFinishedAt = new Date().toISOString();
    }
  }

  start(): void {
    if (this.timer || SETTINGS.snapshotIntervalMinutes <= 0 || !parseTargets().length) return;
    void this.runNow();
    this.timer = setInterval(() => void this.runNow(), SETTINGS.snapshotIntervalMinutes * 60_000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export const snapshotScheduler = new SnapshotScheduler();
