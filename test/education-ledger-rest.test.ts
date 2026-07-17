import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

describe("Education Ledger REST contract", () => {
  it("publishes a cited, validated national education snapshot", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/education"));
    const body = await response!.json() as any;

    expect(response?.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.kind).toBe("uae_education_ledger");
    expect(body.data.snapshot.generalEducation.total).toBe(1_811_145);
    expect(body.meta.delivery).toBe("verified_snapshot");
    expect(body.meta.citation).toContain("fcsc.gov.ae");
  });
});
