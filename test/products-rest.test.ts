import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

describe("product registry REST contract", () => {
  it("exposes the same twenty-four public products used by the website", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/products"));
    const payload = await response?.json();
    expect(response?.status).toBe(200);
    expect(payload.meta).toMatchObject({ total: 24, published: 24 });
    expect(payload.data[0]).toMatchObject({ id: "employment_gender", webPath: "/employment-gender", apiPath: "/api/v1/employment-gender" });
    expect(payload.data.at(-1)).toMatchObject({ id: "open_data_observatory", webPath: "/observatory", apiPath: "/api/v1/observatory" });
  });

  it("publishes the Evidence Dossier pillar catalogue and product mapping", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/products"));
    const payload = await response?.json();

    expect(payload.meta.evidenceDossier).toMatchObject({
      pillarIds: ["education", "health_facilities", "health_indicators", "industry", "tax_activity"],
      productPillarMap: {
        education_ledger: ["education"],
        health_facilities_atlas: ["health_facilities"],
        health_indicators: ["health_indicators"],
        industry_atlas: ["industry"],
        tax_service_activity: ["tax_activity"],
      },
      questionPrivacy: { handling: "transient", persisted: false },
    });
    expect(payload.meta.evidenceDossier.pillars[0]).toMatchObject({
      id: "education",
      productIds: ["education_ledger"],
      title: { en: "Education", ar: "التعليم" },
    });
    expect(payload.meta.evidenceDossier.examples[0]).toEqual({
      template: "research_dossier",
      question: "What official evidence describes education and health provision in the UAE?",
      language: "en",
      pillars: ["education", "health_facilities"],
    });
    expect(payload.data.find(({ id }: { id: string }) => id === "education_ledger").evidenceDossierPillarIds).toEqual(["education"]);
    expect(payload.data.find(({ id }: { id: string }) => id === "tourism_pulse").evidenceDossierPillarIds).toEqual([]);
  });
});
