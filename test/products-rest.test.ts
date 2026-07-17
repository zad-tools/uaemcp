import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

describe("product registry REST contract", () => {
  it("exposes the same eleven public products used by the website", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/products"));
    const payload = await response?.json();
    expect(response?.status).toBe(200);
    expect(payload.meta).toEqual({ total: 11, published: 11 });
    expect(payload.data[0]).toMatchObject({ id: "startup_support_navigator", webPath: "/startup-support", apiPath: "/api/v1/startup-support" });
    expect(payload.data.at(-1)).toMatchObject({ id: "open_data_observatory", webPath: "/observatory", apiPath: "/api/v1/observatory" });
  });
});
