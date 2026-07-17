import { describe, expect, it } from "bun:test";
import { HealthScanScheduler } from "../src/health-scheduler.js";

describe("observatory health scheduler", () => {
  it("records run status without overlapping scans", async () => {
    let calls = 0;
    let release: () => void = () => {};
    const scheduler = new HealthScanScheduler(60, async () => {
      calls += 1;
      await new Promise<void>((resolve) => { release = resolve; });
      return { total_sources: 2, status_counts: { ok: 1, down: 1 } };
    });
    const first = scheduler.runNow();
    const second = scheduler.runNow();
    expect(scheduler.status()).toMatchObject({ enabled: true, running: true, intervalMinutes: 60 });
    expect(calls).toBe(1);
    release();
    await Promise.all([first, second]);
    expect(scheduler.status()).toMatchObject({ running: false, lastResult: { total_sources: 2 } });
  });
});
