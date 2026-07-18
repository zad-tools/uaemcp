import { expect, it } from "bun:test";
import { observatoryPage } from "../src/observatory-web.js";

it("shows reachability, p95 latency, observation freshness and failure reasons", () => {
  const html = observatoryPage();
  expect(html).toContain("OBSERVED REACHABILITY");
  expect(html).toContain("P95 LATENCY");
  expect(html).toContain('id="freshness"');
  expect(html).toContain('id="failureReasons"');
  expect(html).toContain("observationFreshness");
  expect(html).toContain("failureReasons");
});
