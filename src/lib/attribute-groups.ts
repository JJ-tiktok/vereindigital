import type { PlayerAttributeCategory, PlayerPositionGroup } from "@prisma/client";

export const goalkeeperSubgroups = {
  kickoff: "Spieleroeffnung",
  basics: "Basistechniken",
  diving: "Abkipptechniken",
  push: "Abdrucktechniken",
  oneOnOne: "1vs.TW & Nahdistanz",
  crosses: "Flanken",
  tacticalDefensive: "Taktik Defensiv",
  tacticalOffensive: "Taktik Offensiv",
} as const;

type GoalkeeperSubgroupSection = { title: string; subgroups: string[] };

// Groups the leaf subgroups above into the four detail-radar sections used on the player page
// (mirrors the four category charts in the reference spreadsheet).
export const goalkeeperDetailSections: GoalkeeperSubgroupSection[] = [
  { title: "Spieleroeffnung", subgroups: [goalkeeperSubgroups.kickoff] },
  {
    title: "Zielverteidigung",
    subgroups: [goalkeeperSubgroups.basics, goalkeeperSubgroups.diving, goalkeeperSubgroups.push, goalkeeperSubgroups.oneOnOne],
  },
  { title: "Raumverteidigung", subgroups: [goalkeeperSubgroups.crosses] },
  { title: "Taktik", subgroups: [goalkeeperSubgroups.tacticalDefensive, goalkeeperSubgroups.tacticalOffensive] },
];

// Finer split used only for the single overview radar (5 axes instead of 4).
export const goalkeeperOverviewGroups: GoalkeeperSubgroupSection[] = [
  { title: "Spieleroeffnung", subgroups: [goalkeeperSubgroups.kickoff] },
  {
    title: "Zielverteidigung",
    subgroups: [goalkeeperSubgroups.basics, goalkeeperSubgroups.diving, goalkeeperSubgroups.push, goalkeeperSubgroups.oneOnOne],
  },
  { title: "Raumverteidigung", subgroups: [goalkeeperSubgroups.crosses] },
  { title: "Taktik Defensiv", subgroups: [goalkeeperSubgroups.tacticalDefensive] },
  { title: "Taktik Offensiv", subgroups: [goalkeeperSubgroups.tacticalOffensive] },
];

export type DefaultAttribute = {
  key: string;
  name: string;
  category: PlayerAttributeCategory;
  positionGroup: PlayerPositionGroup;
  subgroup?: string;
  sortOrder: number;
};

// Deprecated coarse goalkeeper attributes, replaced by the detailed set below.
// Kept here only so ensureDefaultAttributeDefinitions can clean them up safely.
export const deprecatedAttributeKeys = ["gk-reflexes", "gk-area-command", "gk-one-on-one", "gk-handling", "gk-distribution"];

export const defaultAttributes: DefaultAttribute[] = [
  { key: "ball-control", name: "Ballkontrolle", category: "TECHNICAL", positionGroup: "ALL", sortOrder: 10 },
  { key: "first-touch", name: "Erster Kontakt", category: "TECHNICAL", positionGroup: "ALL", sortOrder: 20 },
  { key: "passing", name: "Passspiel", category: "TECHNICAL", positionGroup: "ALL", sortOrder: 30 },
  { key: "finishing", name: "Abschluss", category: "TECHNICAL", positionGroup: "ALL", sortOrder: 40 },
  { key: "dribbling", name: "Dribbling", category: "TECHNICAL", positionGroup: "ALL", sortOrder: 50 },
  { key: "game-intelligence", name: "Spielverstaendnis", category: "TACTICAL", positionGroup: "ALL", sortOrder: 60 },
  { key: "positioning", name: "Stellungsspiel", category: "TACTICAL", positionGroup: "ALL", sortOrder: 70 },
  { key: "decision-making", name: "Entscheidungsverhalten", category: "TACTICAL", positionGroup: "ALL", sortOrder: 80 },
  { key: "pressing", name: "Pressingverhalten", category: "TACTICAL", positionGroup: "ALL", sortOrder: 90 },
  { key: "pace", name: "Schnelligkeit", category: "PHYSICAL", positionGroup: "ALL", sortOrder: 100 },
  { key: "stamina", name: "Ausdauer", category: "PHYSICAL", positionGroup: "ALL", sortOrder: 110 },
  { key: "strength", name: "Kraft", category: "PHYSICAL", positionGroup: "ALL", sortOrder: 120 },
  { key: "agility", name: "Beweglichkeit", category: "PHYSICAL", positionGroup: "ALL", sortOrder: 130 },
  { key: "work-rate", name: "Einsatzbereitschaft", category: "MENTAL", positionGroup: "ALL", sortOrder: 140 },
  { key: "concentration", name: "Konzentration", category: "MENTAL", positionGroup: "ALL", sortOrder: 150 },
  { key: "teamwork", name: "Teamfaehigkeit", category: "MENTAL", positionGroup: "ALL", sortOrder: 160 },
  { key: "leadership", name: "Fuehrungsverhalten", category: "MENTAL", positionGroup: "ALL", sortOrder: 170 },

  // Spieleroeffnung
  { key: "gk-throw", name: "Abwurf", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.kickoff, sortOrder: 300 },
  { key: "gk-passing", name: "Passspiel", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.kickoff, sortOrder: 301 },
  { key: "gk-ball-control", name: "Ballan-/mitnahme", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.kickoff, sortOrder: 302 },
  { key: "gk-volley-direct", name: "Flugball direkt", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.kickoff, sortOrder: 303 },
  { key: "gk-volley-indirect", name: "Flugball indirekt", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.kickoff, sortOrder: 304 },
  { key: "gk-dropkick", name: "Abschlag Dropkick", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.kickoff, sortOrder: 305 },
  { key: "gk-hip-kick", name: "Abschlag Hueftdrehstoss", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.kickoff, sortOrder: 306 },

  // Zielverteidigung – Basistechniken
  { key: "gk-catch-chest-high", name: "Fangen halbhoch", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.basics, sortOrder: 310 },
  { key: "gk-catch-low-central", name: "Fangen flach zentral", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.basics, sortOrder: 311 },

  // Zielverteidigung – Abkipptechniken
  { key: "gk-tip-low", name: "Abkippen flach", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.diving, sortOrder: 320 },
  { key: "gk-tip-chest-high", name: "Abkippen halbhoch", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.diving, sortOrder: 321 },

  // Zielverteidigung – Abdrucktechniken
  { key: "gk-push-low", name: "Abdruck flach", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.push, sortOrder: 330 },
  { key: "gk-push-chest-high", name: "Abdruck halbhoch", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.push, sortOrder: 331 },
  { key: "gk-crossover", name: "Uebergreifen", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.push, sortOrder: 332 },
  { key: "gk-lob-defense", name: "Lob-Abwehr", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.push, sortOrder: 333 },

  // Zielverteidigung – 1vs.TW & Nahdistanz
  { key: "gk-diving-at-feet", name: "Abtauchen", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.oneOnOne, sortOrder: 340 },
  { key: "gk-block-short", name: "Block kurz", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.oneOnOne, sortOrder: 341 },
  { key: "gk-block-long", name: "Block lang", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.oneOnOne, sortOrder: 342 },
  { key: "gk-ball-attack", name: "Ballangriff", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.oneOnOne, sortOrder: 343 },

  // Raumverteidigung – Flanken
  { key: "gk-cross-near-post", name: "1. Pfosten", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.crosses, sortOrder: 350 },
  { key: "gk-cross-central", name: "Zentral", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.crosses, sortOrder: 351 },
  { key: "gk-cross-far-post", name: "2. Pfosten", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.crosses, sortOrder: 352 },
  { key: "gk-punching", name: "Fausten", category: "GOALKEEPER", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.crosses, sortOrder: 353 },

  // Taktik – Defensiv
  { key: "gk-tac-positioning-goal", name: "Stellungsspiel Zielverteidigung", category: "TACTICAL", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.tacticalDefensive, sortOrder: 360 },
  { key: "gk-tac-positioning-space", name: "Stellungsspiel Raumverteidigung", category: "TACTICAL", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.tacticalDefensive, sortOrder: 361 },
  { key: "gk-tac-cross-pass-defense", name: "Querpassverteidigung", category: "TACTICAL", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.tacticalDefensive, sortOrder: 362 },
  { key: "gk-tac-through-ball-behavior", name: "Verhalten bei Steilpaessen", category: "TACTICAL", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.tacticalDefensive, sortOrder: 363 },
  { key: "gk-tac-one-on-one-behavior", name: "Verhalten 1vs.TW", category: "TACTICAL", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.tacticalDefensive, sortOrder: 364 },

  // Taktik – Offensiv
  { key: "gk-tac-buildup", name: "Mitspielen / Spieleroeffnung", category: "TACTICAL", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.tacticalOffensive, sortOrder: 370 },
  { key: "gk-tac-transition", name: "Umschaltspiel / Kontereinleitung", category: "TACTICAL", positionGroup: "GOALKEEPER", subgroup: goalkeeperSubgroups.tacticalOffensive, sortOrder: 371 },
];

export function mapPositionToGroup(position: string | null | undefined): PlayerPositionGroup {
  switch (position) {
    case "TW":
      return "GOALKEEPER";
    case "IV":
      return "DEFENDER";
    case "AV":
      return "FULLBACK";
    case "DM":
    case "ZM":
    case "OM":
      return "MIDFIELDER";
    case "FL":
      return "WINGER";
    case "ST":
      return "FORWARD";
    default:
      return "ALL";
  }
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
