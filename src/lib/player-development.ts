import { PlayerAttributeCategory, PlayerPositionGroup } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const defaultAttributes = [
  ["ball-control", "Ballkontrolle", PlayerAttributeCategory.TECHNICAL, PlayerPositionGroup.ALL, 10],
  ["first-touch", "Erster Kontakt", PlayerAttributeCategory.TECHNICAL, PlayerPositionGroup.ALL, 20],
  ["passing", "Passspiel", PlayerAttributeCategory.TECHNICAL, PlayerPositionGroup.ALL, 30],
  ["finishing", "Abschluss", PlayerAttributeCategory.TECHNICAL, PlayerPositionGroup.ALL, 40],
  ["dribbling", "Dribbling", PlayerAttributeCategory.TECHNICAL, PlayerPositionGroup.ALL, 50],
  ["game-intelligence", "Spielverstaendnis", PlayerAttributeCategory.TACTICAL, PlayerPositionGroup.ALL, 60],
  ["positioning", "Stellungsspiel", PlayerAttributeCategory.TACTICAL, PlayerPositionGroup.ALL, 70],
  ["decision-making", "Entscheidungsverhalten", PlayerAttributeCategory.TACTICAL, PlayerPositionGroup.ALL, 80],
  ["pressing", "Pressingverhalten", PlayerAttributeCategory.TACTICAL, PlayerPositionGroup.ALL, 90],
  ["pace", "Schnelligkeit", PlayerAttributeCategory.PHYSICAL, PlayerPositionGroup.ALL, 100],
  ["stamina", "Ausdauer", PlayerAttributeCategory.PHYSICAL, PlayerPositionGroup.ALL, 110],
  ["strength", "Kraft", PlayerAttributeCategory.PHYSICAL, PlayerPositionGroup.ALL, 120],
  ["agility", "Beweglichkeit", PlayerAttributeCategory.PHYSICAL, PlayerPositionGroup.ALL, 130],
  ["work-rate", "Einsatzbereitschaft", PlayerAttributeCategory.MENTAL, PlayerPositionGroup.ALL, 140],
  ["concentration", "Konzentration", PlayerAttributeCategory.MENTAL, PlayerPositionGroup.ALL, 150],
  ["teamwork", "Teamfaehigkeit", PlayerAttributeCategory.MENTAL, PlayerPositionGroup.ALL, 160],
  ["leadership", "Fuehrungsverhalten", PlayerAttributeCategory.MENTAL, PlayerPositionGroup.ALL, 170],
  ["gk-reflexes", "Reflexe", PlayerAttributeCategory.GOALKEEPER, PlayerPositionGroup.GOALKEEPER, 180],
  ["gk-area-command", "Strafraumbeherrschung", PlayerAttributeCategory.GOALKEEPER, PlayerPositionGroup.GOALKEEPER, 190],
  ["gk-one-on-one", "Eins-gegen-eins", PlayerAttributeCategory.GOALKEEPER, PlayerPositionGroup.GOALKEEPER, 200],
  ["gk-handling", "Fangtechnik", PlayerAttributeCategory.GOALKEEPER, PlayerPositionGroup.GOALKEEPER, 210],
  ["gk-distribution", "Spieleroeffnung", PlayerAttributeCategory.GOALKEEPER, PlayerPositionGroup.GOALKEEPER, 220],
] as const;

export async function ensureDefaultAttributeDefinitions(clubId: string) {
  await prisma.playerAttributeDefinition.createMany({
    data: defaultAttributes.map(([key, name, category, positionGroup, sortOrder]) => ({
      clubId,
      key,
      name,
      category,
      positionGroup,
      sortOrder,
      isSystemDefault: true,
    })),
    skipDuplicates: true,
  });
}

export function attributeCategoryLabel(category: PlayerAttributeCategory) {
  switch (category) {
    case "TECHNICAL":
      return "Technik";
    case "TACTICAL":
      return "Taktik";
    case "PHYSICAL":
      return "Physis";
    case "MENTAL":
      return "Mentalitaet";
    case "GOALKEEPER":
      return "Torhueter";
    default:
      return "Positionsspezifisch";
  }
}

export function fileEntryTypeLabel(type: string) {
  switch (type) {
    case "PLAYER_TALK":
      return "Spielergespraech";
    case "GOAL_AGREEMENT":
      return "Zielvereinbarung";
    case "FEEDBACK":
      return "Feedback";
    case "TRAINING_OBSERVATION":
      return "Trainingsbeobachtung";
    case "MATCH_OBSERVATION":
      return "Spielbeobachtung";
    case "DISCIPLINE":
      return "Verhalten / Disziplin";
    case "LOAD_INJURY":
      return "Verletzung / Belastung";
    default:
      return "Sonstige Notiz";
  }
}
