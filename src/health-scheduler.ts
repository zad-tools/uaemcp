import { SETTINGS } from "./config.js";
import { buildDashboardSummary } from "./dashboard.js";

type ScanResult = Record<string, unknown>;
type Scan = () => Promise<ScanResult>;

export class HealthScanScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private lastStartedAt: string | null = null;
  private lastFinishedAt: string | null = null;
  private lastResult: ScanResult | null = null;
  private lastError: string | null = null;

  constructor(private readonly intervalMinutes = SETTINGS.healthScanIntervalMinutes, private readonly scan: Scan = async () => buildDashboardSummary({ useCache: false, recordHistory: true }) as unknown as ScanResult) {}

  status(): Record<string, unknown> {
    return {
      enabled: this.intervalMinutes > 0,
      running: this.running,
      intervalMinutes: this.intervalMinutes,
      lastStartedAt: this.lastStartedAt,
      lastFinishedAt: this.lastFinishedAt,
      lastResult: this.lastResult,
      lastError: this.lastError,
    };
  }

  async runNow(): Promise<ScanResult | null> {
    if (this.running) return this.lastResult;
    this.running = true;
    this.lastStartedAt = new Date().toISOString();
    this.lastError = null;
    try {
      this.lastResult = await this.scan();
      return this.lastResult;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      return null;
    } finally {
      this.running = false;
      this.lastFinishedAt = new Date().toISOString();
    }
  }

  start(): void {
    if (this.timer || this.intervalMinutes <= 0) return;
    void this.runNow();
    this.timer = setInterval(() => void this.runNow(), this.intervalMinutes * 60_000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export const healthScanScheduler = new HealthScanScheduler();
