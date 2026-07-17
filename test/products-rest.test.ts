import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

describe("product registry REST contract", () => {
  it("exposes the same twenty-four public products used by the website", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/products"));
    const payload = await response?.json();
    expect(response?.status).toBe(200);
    expect(payload.meta).toEqual({ total: 24, published: 24 });
    expect(payload.data[0]).toMatchObject({ id: "employment_gender", webPath: "/employment-gender", apiPath: "/api/v1/employment-gender" });
    expect(payload.data.at(-1)).toMatchObject({ id: "open_data_observatory", webPath: "/observatory", apiPath: "/api/v1/observatory" });
  });
});
