import { afterEach, describe, expect, it } from "bun:test";
import { requireWrite } from "../src/auth.js";
import { SETTINGS } from "../src/config.js";
import { Unauthorized } from "../src/errors.js";

const original = SETTINGS.writeToken;
afterEach(() => {
  SETTINGS.writeToken = original;
});

describe("requireWrite", () => {
  it("throws when writes are disabled (no token configured)", () => {
    SETTINGS.writeToken = null;
    expect(() => requireWrite("anything")).toThrow(Unauthorized);
  });

  it("accepts the correct token", () => {
    SETTINGS.writeToken = "secret";
    expect(() => requireWrite("secret")).not.toThrow();
  });

  it("rejects a wrong token", () => {
    SETTINGS.writeToken = "secret";
    expect(() => requireWrite("nope")).toThrow(Unauthorized);
  });

  it("rejects a missing token", () => {
    SETTINGS.writeToken = "secret";
    expect(() => requireWrite(undefined)).toThrow(Unauthorized);
  });
});
