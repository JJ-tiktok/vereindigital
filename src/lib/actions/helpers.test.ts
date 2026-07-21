import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  availabilityReason,
  formDataToObject,
  parseForm,
  zDate,
  zIntWithFallback,
  zOptionalFloat,
  zOptionalInt,
  zOptionalString,
  zRequiredString,
} from "@/lib/actions/helpers";

function makeFormData(entries: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

describe("formDataToObject", () => {
  it("trims values and keeps only string entries", () => {
    const formData = makeFormData({ a: "  x  ", b: "" });

    expect(formDataToObject(formData)).toEqual({ a: "x", b: "" });
  });
});

describe("parseForm", () => {
  const schema = z.object({
    title: zRequiredString,
    startsAt: zDate,
    note: zOptionalString,
  });

  it("returns parsed data on success", () => {
    const result = parseForm(makeFormData({ title: "Training", startsAt: "2026-07-01T19:00", note: "" }), schema);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.title).toBe("Training");
      expect(result.data.startsAt).toBeInstanceOf(Date);
      expect(result.data.note).toBeNull();
    }
  });

  it("returns field errors on invalid input", () => {
    const result = parseForm(makeFormData({ title: "", startsAt: "kein-datum" }), schema);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.state.fieldErrors?.title?.[0]).toBeTruthy();
      expect(result.state.fieldErrors?.startsAt?.[0]).toBeTruthy();
    }
  });
});

describe("field schemas", () => {
  it("zOptionalInt parses numbers and maps blanks/garbage to null", () => {
    expect(zOptionalInt.parse("42")).toBe(42);
    expect(zOptionalInt.parse("")).toBeNull();
    expect(zOptionalInt.parse(undefined)).toBeNull();
    expect(zOptionalInt.parse("abc")).toBeNull();
  });

  it("zIntWithFallback falls back for blanks and garbage", () => {
    const schema = zIntWithFallback(14);

    expect(schema.parse("7")).toBe(7);
    expect(schema.parse("")).toBe(14);
    expect(schema.parse("xx")).toBe(14);
  });

  it("zOptionalFloat accepts comma decimals", () => {
    expect(zOptionalFloat.parse("7,5")).toBe(7.5);
    expect(zOptionalFloat.parse("8.25")).toBe(8.25);
    expect(zOptionalFloat.parse("")).toBeNull();
  });

  it("zRequiredString rejects whitespace-only input", () => {
    expect(zRequiredString.safeParse("   ").success).toBe(false);
    expect(zRequiredString.safeParse("ok").success).toBe(true);
  });
});

describe("availabilityReason", () => {
  it("maps availability types to german labels", () => {
    expect(availabilityReason("VACATION")).toBe("Urlaub");
    expect(availabilityReason("INJURY")).toBe("Verletzung");
    expect(availabilityReason("ILLNESS")).toBe("Krankheit");
    expect(availabilityReason("OTHER")).toBe("Abwesenheit");
  });
});
