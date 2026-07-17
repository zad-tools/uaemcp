import { describe, expect, it } from "bun:test";
import { REDACTED, redactRecord, redactRecords } from "../src/redaction.js";

describe("redaction", () => {
  it("redacts by field name", () => {
    const out = redactRecord({ CompanyName: "Acme LLC", ContactPhone: "+971501234567", ContactEmail: "a@b.ae" });
    expect(out.CompanyName).toBe("Acme LLC");
    expect(out.ContactPhone).toBe(REDACTED);
    expect(out.ContactEmail).toBe(REDACTED);
  });

  it("redacts by value pattern even with a neutral field name", () => {
    const out = redactRecord({ note: "reach us at sales@example.ae or +971 4 123 4567" });
    expect(out.note).toBe(REDACTED);
  });

  it("keeps non-contact values untouched", () => {
    const out = redactRecord({ Latitude: "24.28", Longitude: "54.49", ID: "B38C48E8", startdate: "2008-10-20", observed_at: "2026-07-17T13:12:49Z" });
    expect(out.Latitude).toBe("24.28");
    expect(out.ID).toBe("B38C48E8");
    expect(out.startdate).toBe("2008-10-20");
    expect(out.observed_at).toBe("2026-07-17T13:12:49Z");
  });

  it("does not mutate the input", () => {
    const rec = { ContactPhone: "0501234567" };
    redactRecord(rec);
    expect(rec.ContactPhone).toBe("0501234567");
  });

  it("redacts nested and list values", () => {
    const out = redactRecord({ contacts: [{ email: "x@y.ae" }, { phone: "0501112223" }] });
    const contacts = out.contacts as Record<string, unknown>[];
    expect(contacts[0].email).toBe(REDACTED);
    expect(contacts[1].phone).toBe(REDACTED);
  });

  it("redacts a batch", () => {
    const out = redactRecords([{ email: "a@b.ae" }, { name: "ok" }]);
    expect(out[0].email).toBe(REDACTED);
    expect(out[1].name).toBe("ok");
  });
});
