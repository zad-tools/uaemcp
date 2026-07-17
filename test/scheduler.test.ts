import { describe, expect, it } from "bun:test";
import { snapshotScheduler } from "../src/scheduler.js";

describe("snapshot scheduler", () => {
  it("is safely disabled without an interval and explicit targets", async () => {
    expect(snapshotScheduler.status()).toMatchObject({ enabled: false, targets: [] });
    expect(await snapshotScheduler.runNow()).toEqual([]);
  });
});
