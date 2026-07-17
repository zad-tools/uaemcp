import { describe, expect, it } from "bun:test";
import { loadAjmanParksProduct } from "../src/ajman-parks-service.js";

describe("Ajman Parks Footfall service", () => {
  it("paginates the official dataset and preserves upstream scope", async () => {
    const calls: number[] = [];
    const fetcher = async (_source: unknown, query: { offset?: number }) => {
      calls.push(query.offset ?? 0);
      return { records: query.offset ? [{ year: 2023, park_name_en: "B", park_name_ar: "ب", numne_of_parks_visitors: "20" }] : [{ year: 2023, park_name_en: "A", park_name_ar: "أ", numne_of_parks_visitors: "10" }], total: 2, fetched_at: "2026-05-13T10:47:26.040Z", citation: "https://data.ajman.ae/explore/dataset/parks-visitors-in-ajman/", license: "CC BY 4.0", data_quality: {} } as never;
    };
    const product = await loadAjmanParksProduct(fetcher as never);
    expect(calls).toEqual([0, 1]);
    expect(product.data.summary.publishedVisitObservations).toBe(30);
    expect(product.meta).toMatchObject({ dataset_id: "parks-visitors-in-ajman", upstream_records: 2, returned_records: 2 });
  });

  it("uses the verified aggregate snapshot when live retrieval fails", async () => {
    const failingFetcher = (async () => { throw new Error("blocked"); }) as never;
    const product = await loadAjmanParksProduct(failingFetcher);
    expect(product.data.delivery).toBe("verified_snapshot");
    expect(product.data.summary).toMatchObject({ publishedVisitObservations: 10470556, validRows: 1120, excludedRows: 8, years: 7 });
    expect(product.meta).toMatchObject({ fallback: true, snapshot_sha256: "c0772a45314a8b8bf4814e7b4b7c6b5b47f8d6ba75e8952edc226503050c3b26" });
  });
});
