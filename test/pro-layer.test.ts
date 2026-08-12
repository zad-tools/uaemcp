import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { deriveProKey, verifyProKey } from "../src/pro-keys.js";
import { ProMetering, proSettings } from "../src/pro-metering.js";

const SECRET = "test-secret";
const DB = "data/test-pro-usage.sqlite";

function metering(): ProMetering {
  return new ProMetering({
    saaspress: { baseUrl: "http://127.0.0.1:9", appId: "app_test", keyId: "key_test", secret: "s" },
    keySecret: SECRET,
    metric: "mcp_calls",
    databasePath: DB,
  });
}

afterEach(() => {
  rmSync(DB, { force: true });
});

describe("pro keys", () => {
  test("derive/verify roundtrip maps to the billing subject", async () => {
    const key = await deriveProKey(18, SECRET);
    expect(key).toMatch(/^oe_18_[0-9a-f]{16}$/);
    expect(await verifyProKey(key, SECRET)).toBe("wp:customer-18");
  });

  test("tampered id, tampered signature, and wrong secret are rejected", async () => {
    const key = await deriveProKey(18, SECRET);
    expect(await verifyProKey(key.replace("_18_", "_19_"), SECRET)).toBeNull();
    expect(await verifyProKey(key.slice(0, -1) + (key.endsWith("0") ? "1" : "0"), SECRET)).toBeNull();
    expect(await verifyProKey(key, "other-secret")).toBeNull();
    expect(await verifyProKey("oe_abc_zzzz", SECRET)).toBeNull();
    expect(await verifyProKey("", SECRET)).toBeNull();
  });
});

describe("pro settings", () => {
  test("null unless SaaSpress and the key secret are both configured", () => {
    expect(proSettings({})).toBeNull();
    expect(proSettings({ UAEMCP_PRO_KEY_SECRET: "x" })).toBeNull();
    const full = proSettings({
      SAASPRESS_BASE_URL: "https://zadstack.com", SAASPRESS_APP_ID: "app_1",
      SAASPRESS_KEY_ID: "key_1", SAASPRESS_SECRET: "s", UAEMCP_PRO_KEY_SECRET: "x",
    });
    expect(full?.metric).toBe("mcp_calls");
    expect(full?.saaspress.baseUrl).toBe("https://zadstack.com");
  });
});

describe("pro metering", () => {
  test("no key gates as free; garbage key is invalid", async () => {
    const m = metering();
    expect((await m.gate(null)).kind).toBe("free");
    expect((await m.gate("oe_1_0000000000000000")).kind).toBe("invalid_key");
    m.stop();
  });

  test("usage counts locally per subject per month", () => {
    const m = metering();
    expect(m.usedThisMonth("wp:customer-18")).toBe(0);
    m.record("wp:customer-18");
    m.record("wp:customer-18");
    m.record("wp:customer-99");
    expect(m.usedThisMonth("wp:customer-18")).toBe(2);
    expect(m.usedThisMonth("wp:customer-99")).toBe(1);
    m.stop();
  });

  test("usage survives a restart (sqlite persistence)", () => {
    const first = metering();
    first.record("wp:customer-18");
    first.stop();
    const second = metering();
    expect(second.usedThisMonth("wp:customer-18")).toBe(1);
    second.stop();
  });

  test("flush batches deltas once with stable idempotency keys and retries failures", async () => {
    const seen: Array<{ idempotencyKey: string; quantity: number }> = [];
    let failNext = true;
    const stub = Bun.serve({
      hostname: "127.0.0.1", port: 0,
      fetch: async (request) => {
        const body = await request.json() as { idempotencyKey: string; quantity: number };
        if (failNext) { failNext = false; return new Response("boom", { status: 503 }); }
        seen.push({ idempotencyKey: body.idempotencyKey, quantity: body.quantity });
        return Response.json({ outcome: "accepted" }, { status: 202 });
      },
    });
    const m = new ProMetering({
      saaspress: { baseUrl: `http://127.0.0.1:${stub.port}`, appId: "app_test", keyId: "key_test", secret: "s" },
      keySecret: SECRET, metric: "mcp_calls", databasePath: DB,
    });

    m.record("wp:customer-18");
    m.record("wp:customer-18");
    const firstFlush = await m.flush(); // control plane down -> batch stays unacked
    expect(firstFlush.failed).toBe(1);
    expect(seen.length).toBe(0);

    const secondFlush = await m.flush(); // same batch id retried -> accepted once
    expect(secondFlush.sent).toBe(1);
    expect(seen).toEqual([{ idempotencyKey: expect.stringMatching(/^oe:batch:\d+$/), quantity: 2 }]);

    m.record("wp:customer-18");
    await m.flush(); // only the new delta goes out
    expect(seen.length).toBe(2);
    expect(seen[1].quantity).toBe(1);
    expect(seen[1].idempotencyKey).not.toBe(seen[0].idempotencyKey);

    m.stop();
    stub.stop(true);
  });
});
