/**
 * Write authentication. Reads are open; writes need a token. If no token is
 * configured, writes are disabled entirely — an unconfigured server cannot be
 * mutated. Comparison is constant-time.
 */

import { timingSafeEqual } from "node:crypto";
import { SETTINGS, writesEnabled } from "./config.js";
import { Unauthorized } from "./errors.js";

export function requireWrite(token: string | null | undefined): void {
  if (!writesEnabled()) {
    throw new Unauthorized(
      "write operations are disabled on this server (no UAEMCP_WRITE_TOKEN set).",
    );
  }
  const expected = Buffer.from(String(SETTINGS.writeToken));
  const got = Buffer.from(String(token ?? ""));
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) {
    throw new Unauthorized("invalid or missing write token.");
  }
}
