import { z } from "zod";

export const positionCodes = ["TW", "IV", "AV", "ZDM", "ZM", "FS", "ZOM", "ST"] as const;
export type PositionCode = (typeof positionCodes)[number];

export const dutyValues = ["DEFENSIVE", "BALANCED", "OFFENSIVE"] as const;
export type DutyValue = (typeof dutyValues)[number];

export const tacticPhaseValues = ["OFFENSE", "DEFENSE"] as const;
export type TacticPhaseValue = (typeof tacticPhaseValues)[number];

export const positionRoles: Record<PositionCode, string[]> = {
  TW: ["Torhueter", "Ballsicherer Torhueter"],
  IV: ["Zentraler Verteidiger", "Ballspielender Verteidiger", "Libero", "Aggressiver Manndecker"],
  AV: ["Aussenverteidiger", "Fluegellaeufer", "Inverser Aussenverteidiger", "Offensiver Aussenverteidiger"],
  ZDM: ["Sechser", "Ballverteiler (tief)", "Box-to-Box", "Abraeumer"],
  ZM: ["Zentrales Mittelfeld", "Ballverteiler", "Box-to-Box-Spieler", "Halbraumspieler"],
  FS: ["Klassischer Fluegelspieler", "Inverser Fluegelspieler", "Fluegelstuermer"],
  ZOM: ["Spielmacher", "Schattenstuermer", "Freie Spitze hinter den Stuermern"],
  ST: ["Zielspieler", "Falsche Neun", "Tiefer Stuermer", "Wandspieler"],
};

export function positionCodeLabel(code: string) {
  switch (code) {
    case "TW":
      return "Torhueter";
    case "IV":
      return "Innenverteidiger";
    case "AV":
      return "Aussenverteidiger";
    case "ZDM":
      return "Defensives Mittelfeld";
    case "ZM":
      return "Zentrales Mittelfeld";
    case "FS":
      return "Fluegelspieler";
    case "ZOM":
      return "Offensives Mittelfeld";
    case "ST":
      return "Stuermer";
    default:
      return code;
  }
}

export function dutyLabel(duty: string) {
  switch (duty) {
    case "DEFENSIVE":
      return "Defensiv";
    case "OFFENSIVE":
      return "Offensiv";
    default:
      return "Ausgeglichen";
  }
}

export function dutyAbbreviation(duty: string) {
  switch (duty) {
    case "DEFENSIVE":
      return "Def";
    case "OFFENSIVE":
      return "Off";
    default:
      return "Aus";
  }
}

export type FormationSlot = { positionCode: PositionCode; x: number; y: number };

export const formationPresets: Record<string, FormationSlot[]> = {
  "4-4-2": [
    { positionCode: "TW", x: 50, y: 8 },
    { positionCode: "AV", x: 15, y: 25 },
    { positionCode: "IV", x: 35, y: 20 },
    { positionCode: "IV", x: 65, y: 20 },
    { positionCode: "AV", x: 85, y: 25 },
    { positionCode: "FS", x: 15, y: 50 },
    { positionCode: "ZM", x: 38, y: 48 },
    { positionCode: "ZM", x: 62, y: 48 },
    { positionCode: "FS", x: 85, y: 50 },
    { positionCode: "ST", x: 40, y: 78 },
    { positionCode: "ST", x: 60, y: 78 },
  ],
  "4-3-3": [
    { positionCode: "TW", x: 50, y: 8 },
    { positionCode: "AV", x: 15, y: 25 },
    { positionCode: "IV", x: 35, y: 20 },
    { positionCode: "IV", x: 65, y: 20 },
    { positionCode: "AV", x: 85, y: 25 },
    { positionCode: "ZDM", x: 50, y: 42 },
    { positionCode: "ZM", x: 30, y: 55 },
    { positionCode: "ZM", x: 70, y: 55 },
    { positionCode: "FS", x: 15, y: 78 },
    { positionCode: "ST", x: 50, y: 85 },
    { positionCode: "FS", x: 85, y: 78 },
  ],
  "4-2-3-1": [
    { positionCode: "TW", x: 50, y: 8 },
    { positionCode: "AV", x: 15, y: 25 },
    { positionCode: "IV", x: 35, y: 20 },
    { positionCode: "IV", x: 65, y: 20 },
    { positionCode: "AV", x: 85, y: 25 },
    { positionCode: "ZDM", x: 38, y: 42 },
    { positionCode: "ZDM", x: 62, y: 42 },
    { positionCode: "ZOM", x: 20, y: 62 },
    { positionCode: "ZOM", x: 50, y: 65 },
    { positionCode: "ZOM", x: 80, y: 62 },
    { positionCode: "ST", x: 50, y: 85 },
  ],
  "3-5-2": [
    { positionCode: "TW", x: 50, y: 8 },
    { positionCode: "IV", x: 30, y: 20 },
    { positionCode: "IV", x: 50, y: 15 },
    { positionCode: "IV", x: 70, y: 20 },
    { positionCode: "AV", x: 10, y: 45 },
    { positionCode: "ZM", x: 35, y: 50 },
    { positionCode: "ZM", x: 50, y: 45 },
    { positionCode: "ZM", x: 65, y: 50 },
    { positionCode: "AV", x: 90, y: 45 },
    { positionCode: "ST", x: 40, y: 80 },
    { positionCode: "ST", x: 60, y: 80 },
  ],
  "5-3-2": [
    { positionCode: "TW", x: 50, y: 8 },
    { positionCode: "AV", x: 10, y: 30 },
    { positionCode: "IV", x: 30, y: 20 },
    { positionCode: "IV", x: 50, y: 15 },
    { positionCode: "IV", x: 70, y: 20 },
    { positionCode: "AV", x: 90, y: 30 },
    { positionCode: "ZM", x: 35, y: 55 },
    { positionCode: "ZM", x: 50, y: 50 },
    { positionCode: "ZM", x: 65, y: 55 },
    { positionCode: "ST", x: 40, y: 80 },
    { positionCode: "ST", x: 60, y: 80 },
  ],
};

export const formationOptions = Object.keys(formationPresets);

export type TacticSlotState = {
  positionCode: PositionCode;
  x: number;
  y: number;
  role: string;
  duty: DutyValue;
  playerProfileId: string | null;
  sortOrder: number;
};

export function createSlotsFromFormation(formationKey: string): TacticSlotState[] {
  const preset = formationPresets[formationKey] ?? formationPresets[formationOptions[0]];

  return preset.map((slot, index) => ({
    positionCode: slot.positionCode,
    x: slot.x,
    y: slot.y,
    role: positionRoles[slot.positionCode][0],
    duty: "BALANCED",
    playerProfileId: null,
    sortOrder: index,
  }));
}

export const sliderDefs = [
  { key: "styleValue", label: "Spielstil", lowLabel: "Direkt", highLabel: "Kombination" },
  { key: "lineValue", label: "Verteidigungslinie", lowLabel: "Tief", highLabel: "Hoch" },
  { key: "pressingValue", label: "Pressing", lowLabel: "Zurueckhaltend", highLabel: "Intensiv" },
  { key: "widthValue", label: "Breite", lowLabel: "Schmal", highLabel: "Breit" },
  { key: "tempoValue", label: "Tempo", lowLabel: "Langsam", highLabel: "Schnell" },
] as const;

export const sliderLevels = ["Sehr niedrig", "Niedrig", "Mittel", "Hoch", "Sehr hoch"];

export function sliderLevelLabel(value: number) {
  return sliderLevels[Math.min(sliderLevels.length - 1, Math.max(0, Math.round(value)))];
}

export function clampSliderValue(value: number) {
  return Math.min(4, Math.max(0, Math.round(value)));
}

export const tacticSlotInputSchema = z.object({
  positionCode: z.string().min(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  role: z.string().min(1),
  duty: z.enum(dutyValues),
  playerProfileId: z.string().nullable(),
  sortOrder: z.number().int().min(0),
});

export const tacticSlotsSchema = z.array(tacticSlotInputSchema).min(1);

export const persistedTacticSlotSchema = tacticSlotInputSchema.extend({
  phase: z.enum(tacticPhaseValues),
});

export const persistedTacticSlotsSchema = z.array(persistedTacticSlotSchema).min(1);
export type PersistedTacticSlot = z.infer<typeof persistedTacticSlotSchema>;

export const tacticArrowInputSchema = z.object({
  phase: z.enum(tacticPhaseValues),
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  sortOrder: z.number().int().min(0),
});

export const tacticArrowsSchema = z.array(tacticArrowInputSchema);
