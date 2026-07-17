/**
 * Generalized aggregation: group_by + metric + filters over any records.
 * market-snapshot is one special case. Dotted paths fan out across list values.
 */

type Rec = Record<string, unknown>;
export type Metric = "count" | "sum" | "avg" | "min" | "max";
const METRICS: Metric[] = ["count", "sum", "avg", "min", "max"];

function resolve(record: Rec, path: string): unknown[] {
  let nodes: unknown[] = [record];
  for (const key of path.split(".")) {
    const next: unknown[] = [];
    for (const node of nodes) {
      if (node && typeof node === "object" && !Array.isArray(node)) {
        const val = (node as Rec)[key];
        if (Array.isArray(val)) next.push(...val);
        else if (val !== undefined && val !== null) next.push(val);
      } else if (Array.isArray(node)) {
        for (const item of node) {
          if (item && typeof item === "object" && key in (item as Rec)) next.push((item as Rec)[key]);
        }
      }
    }
    nodes = next;
  }
  return nodes;
}

function toNumber(value: unknown): number | null {
  const f = typeof value === "number" ? value : Number(value);
  return Number.isFinite(f) ? f : null;
}

export interface AggRow {
  group: Record<string, string | null>;
  value: number;
  n: number;
}

export function aggregate(
  records: Rec[],
  opts: { group_by: string[]; metric?: Metric; value_field?: string; filters?: Rec; top?: number },
): AggRow[] {
  const metric = opts.metric ?? "count";
  if (!METRICS.includes(metric)) throw new Error(`metric must be one of ${METRICS.join(", ")}`);
  if (metric !== "count" && !opts.value_field) throw new Error(`metric '${metric}' requires a value_field`);
  const filters = opts.filters ?? {};
  const top = opts.top ?? 20;

  const buckets = new Map<string, { keys: (string | null)[]; n: number; nums: number[] }>();
  for (const rec of records) {
    let ok = true;
    for (const [field, expected] of Object.entries(filters)) {
      if (!resolve(rec, field).map(String).includes(String(expected))) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    let combos: (string | null)[][] = [[]];
    for (const field of opts.group_by) {
      const vals = resolve(rec, field);
      const use = vals.length ? vals : [null];
      combos = combos.flatMap((c) => use.map((v) => [...c, v === null ? null : String(v)]));
    }
    for (const combo of combos) {
      const key = JSON.stringify(combo);
      let b = buckets.get(key);
      if (!b) {
        b = { keys: combo, n: 0, nums: [] };
        buckets.set(key, b);
      }
      b.n += 1;
      if (metric !== "count" && opts.value_field) {
        const first = resolve(rec, opts.value_field);
        const num = first.length ? toNumber(first[0]) : null;
        if (num !== null) b.nums.push(num);
      }
    }
  }

  const rows: AggRow[] = [];
  for (const b of buckets.values()) {
    let value: number;
    if (metric === "count") value = b.n;
    else if (metric === "sum") value = b.nums.reduce((a, x) => a + x, 0);
    else if (metric === "avg") value = b.nums.length ? b.nums.reduce((a, x) => a + x, 0) / b.nums.length : 0;
    else if (metric === "min") value = b.nums.length ? Math.min(...b.nums) : 0;
    else value = b.nums.length ? Math.max(...b.nums) : 0;
    const group: Record<string, string | null> = {};
    opts.group_by.forEach((field, i) => (group[field] = b.keys[i]));
    rows.push({ group, value: Number(value.toFixed(4)), n: b.n });
  }
  rows.sort((a, b) => b.value - a.value || b.n - a.n);
  return rows.slice(0, top);
}
