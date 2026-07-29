import { describe, expect, it } from "vitest";

import {
  createSlotsFromFormation,
  dutyLabel,
  formationOptions,
  formationPresets,
  positionCodeLabel,
  positionRoles,
  sliderLevelLabel,
  tacticArrowsSchema,
  tacticSlotsSchema,
  clampSliderValue,
} from "@/lib/tactics";

describe("positionCodeLabel", () => {
  it("maps every formation position code to a German label", () => {
    expect(positionCodeLabel("TW")).toBe("Torhueter");
    expect(positionCodeLabel("IV")).toBe("Innenverteidiger");
    expect(positionCodeLabel("AV")).toBe("Aussenverteidiger");
    expect(positionCodeLabel("ZDM")).toBe("Defensives Mittelfeld");
    expect(positionCodeLabel("ZM")).toBe("Zentrales Mittelfeld");
    expect(positionCodeLabel("FS")).toBe("Fluegelspieler");
    expect(positionCodeLabel("ZOM")).toBe("Offensives Mittelfeld");
    expect(positionCodeLabel("ST")).toBe("Stuermer");
  });

  it("falls back to the raw code for unknown values", () => {
    expect(positionCodeLabel("XX")).toBe("XX");
  });
});

describe("dutyLabel", () => {
  it("maps duty values to German labels", () => {
    expect(dutyLabel("DEFENSIVE")).toBe("Defensiv");
    expect(dutyLabel("OFFENSIVE")).toBe("Offensiv");
    expect(dutyLabel("BALANCED")).toBe("Ausgeglichen");
  });

  it("defaults unknown duty values to Ausgeglichen", () => {
    expect(dutyLabel("unknown")).toBe("Ausgeglichen");
  });
});

describe("sliderLevelLabel / clampSliderValue", () => {
  it("maps the 0-4 range to five German level labels", () => {
    expect(sliderLevelLabel(0)).toBe("Sehr niedrig");
    expect(sliderLevelLabel(2)).toBe("Mittel");
    expect(sliderLevelLabel(4)).toBe("Sehr hoch");
  });

  it("clamps out-of-range values", () => {
    expect(clampSliderValue(-3)).toBe(0);
    expect(clampSliderValue(99)).toBe(4);
    expect(clampSliderValue(2.4)).toBe(2);
  });
});

describe("formationPresets", () => {
  it("defines all five reference formations with valid position codes", () => {
    expect(formationOptions).toEqual(["4-4-2", "4-3-3", "4-2-3-1", "3-5-2", "5-3-2"]);

    for (const key of formationOptions) {
      const slots = formationPresets[key];
      expect(slots).toHaveLength(11);

      for (const slot of slots) {
        expect(positionRoles[slot.positionCode]).toBeDefined();
        expect(slot.x).toBeGreaterThanOrEqual(0);
        expect(slot.x).toBeLessThanOrEqual(100);
        expect(slot.y).toBeGreaterThanOrEqual(0);
        expect(slot.y).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("createSlotsFromFormation", () => {
  it("builds 11 default slots with the first role option and balanced duty", () => {
    const slots = createSlotsFromFormation("4-4-2");

    expect(slots).toHaveLength(11);
    expect(slots[0].positionCode).toBe("TW");
    expect(slots[0].role).toBe(positionRoles.TW[0]);
    expect(slots[0].duty).toBe("BALANCED");
    expect(slots[0].playerProfileId).toBeNull();
    expect(slots.map((slot) => slot.sortOrder)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("falls back to the first formation for an unknown key", () => {
    const slots = createSlotsFromFormation("does-not-exist");
    expect(slots).toHaveLength(11);
  });
});

describe("tacticSlotsSchema / tacticArrowsSchema", () => {
  it("accepts a valid slot list", () => {
    const result = tacticSlotsSchema.safeParse(createSlotsFromFormation("4-4-2"));
    expect(result.success).toBe(true);
  });

  it("rejects a slot with an out-of-range coordinate", () => {
    const invalid = createSlotsFromFormation("4-4-2");
    invalid[0].x = 150;
    const result = tacticSlotsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts a valid arrow list", () => {
    const result = tacticArrowsSchema.safeParse([
      { phase: "OFFENSE", x1: 10, y1: 10, x2: 90, y2: 90, sortOrder: 0 },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects an arrow with an invalid phase", () => {
    const result = tacticArrowsSchema.safeParse([
      { phase: "SOMETHING", x1: 10, y1: 10, x2: 90, y2: 90, sortOrder: 0 },
    ]);
    expect(result.success).toBe(false);
  });
});
