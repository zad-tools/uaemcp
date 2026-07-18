#!/usr/bin/env bun

import { runCli } from "uaemcp/cli";

if (import.meta.main) {
  runCli().catch((error: unknown) => {
    process.stderr.write(`fatal: ${error instanceof Error ? error.stack : String(error)}\n`);
    process.exit(1);
  });
}
