import { createFetchHandler } from "../src/index.js";

const iterations = Math.max(10, Number(Bun.env.UAEMCP_BENCHMARK_ITERATIONS ?? 200));
const handler = createFetchHandler();
const routes = ["/healthz", "/api/v1/coverage", "/api/v1/sources", "/api/v1/search?q=Dubai"];

function percentile(values: number[], ratio: number): number {
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

const results: Record<string, { iterations: number; p50Ms: number; p95Ms: number; requestsPerSecond: number }> = {};
for (const route of routes) {
  await handler(new Request(`http://localhost${route}`));
  const samples: number[] = [];
  const started = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    const before = performance.now();
    const response = await handler(new Request(`http://localhost${route}`, { headers: { "x-forwarded-for": `bench-${index}` } }));
    if (!response.ok) throw new Error(`${route} returned HTTP ${response.status}`);
    await response.arrayBuffer();
    samples.push(performance.now() - before);
  }
  const duration = performance.now() - started;
  results[route] = {
    iterations,
    p50Ms: Number(percentile(samples, 0.5).toFixed(3)),
    p95Ms: Number(percentile(samples, 0.95).toFixed(3)),
    requestsPerSecond: Number(((iterations * 1000) / duration).toFixed(1)),
  };
}

process.stdout.write(`${JSON.stringify({ runtime: `Bun ${Bun.version}`, measuredAt: new Date().toISOString(), results }, null, 2)}\n`);
