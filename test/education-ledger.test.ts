import { describe, expect, it } from "bun:test";
import { buildEducationLedger } from "../src/education-ledger.js";

describe("UAE Education Ledger", () => {
  it("preserves the accredited 2023/2024 national totals and reconciles sex splits", () => {
    const ledger = buildEducationLedger();

    expect(ledger.snapshot.generalEducation).toEqual({ total: 1_811_145, female: 890_341, male: 920_804 });
    expect(ledger.snapshot.educationalPersonnel).toEqual({ total: 162_533, female: 120_876, male: 41_657 });
    expect(ledger.validation).toEqual({ studentSexSplitReconciles: true, personnelSexSplitReconciles: true });
    expect(ledger.derived.studentsPerEducationalPersonnel).toBeCloseTo(11.143, 3);
  });

  it("keeps the ministry resource catalogue separate from the national snapshot", () => {
    const ledger = buildEducationLedger();

    expect(ledger.catalogue).toHaveLength(7);
    expect(ledger.catalogue.map((resource) => resource.id)).toContain("students_by_sector_2018_2024");
    expect(ledger.source.delivery).toBe("verified_snapshot");
    expect(ledger.source.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(ledger.limitations.join(" ")).toContain("not combined");
  });
});
