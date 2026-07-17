import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

describe("MOHRE Employment by Gender REST contract", () => {
  it("returns a filtered, source-cited verified series", async () => {
    const response = await handleRest(
      new Request("http://localhost/api/v1/employment-gender?gender=female&from_year=2023&to_year=2024"),
      { fetchEmploymentGenderWorkbook: async () => { throw new Error("blocked"); } },
    );
    const payload = await response!.json();

    expect(response?.status).toBe(200);
    expect(payload.data).toMatchObject({
      kind: "uae_employment_gender_2020_2024",
      scope: { gender: "female", fromYear: 2023, toYear: 2024, returnedObservations: 2 },
      observations: [{ year: 2023, gender: "female", value: 0.1314216873655702, unit: "ratio" }, { year: 2024, gender: "female", value: 0.14187283284293503, unit: "ratio" }],
    });
    expect(payload.meta).toMatchObject({
      source_id: "mohre_employment_gender_2020_2024",
      delivery: "verified_snapshot",
      filters: { gender: "female", from_year: 2023, to_year: 2024 },
      private_sector_only: true,
      population_total: false,
    });
  });

  it("rejects unknown genders, out-of-range years and reversed ranges", async () => {
    expect((await handleRest(new Request("http://localhost/api/v1/employment-gender?gender=other")))?.status).toBe(422);
    expect((await handleRest(new Request("http://localhost/api/v1/employment-gender?from_year=2019")))?.status).toBe(422);
    expect((await handleRest(new Request("http://localhost/api/v1/employment-gender?from_year=2024&to_year=2023")))?.status).toBe(422);
  });
});
