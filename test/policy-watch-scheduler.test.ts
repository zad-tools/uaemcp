import { describe, expect, it } from "bun:test";
import { PolicyWatchScheduler } from "../src/policy-watch-scheduler.js";

describe("Policy Evidence Watch scheduler", () => {
  it("runs one bounded scan at a time and exposes honest status", async () => {
    let calls = 0;
    let release: () => void = () => {};
    const scheduler = new PolicyWatchScheduler(1_440, async () => {
      calls += 1;
      await new Promise<void>((resolve) => { release = resolve; });
      return { summary: { checked: 4, unavailable: 1 }, generatedAt: "2026-07-17T00:00:00Z" };
    });
    const first = scheduler.runNow();
    const second = scheduler.runNow();
    expect(calls).toBe(1);
    expect(scheduler.status()).toMatchObject({ enabled: true, running: true, intervalMinutes: 1_440 });
    release();
    await Promise.all([first, second]);
    expect(scheduler.status()).toMatchObject({ running: false, lastResult: { summary: { checked: 4, unavailable: 1 } }, lastError: null });
  });

  it("is disabled when the interval is zero", () => {
    const scheduler = new PolicyWatchScheduler(0, async () => ({}));
    expect(scheduler.status()).toMatchObject({ enabled: false, running: false });
  });
});
