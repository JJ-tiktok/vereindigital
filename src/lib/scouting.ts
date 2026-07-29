import type { ScoutingEventType, ScoutingStatus } from "@prisma/client";

export const scoutingPositions = ["TW", "IV", "AV", "DM", "ZM", "OM", "FL", "ST"] as const;

export const scoutingStatusValues: ScoutingStatus[] = [
  "WATCHING",
  "CONTACTED",
  "TRIAL",
  "OFFER_MADE",
  "SIGNED",
  "REJECTED",
  "ARCHIVED",
];

export function scoutingStatusLabel(status: ScoutingStatus | string) {
  switch (status) {
    case "WATCHING":
      return "Beobachtung";
    case "CONTACTED":
      return "Kontaktiert";
    case "TRIAL":
      return "Probetraining";
    case "OFFER_MADE":
      return "Angebot";
    case "SIGNED":
      return "Verpflichtet";
    case "REJECTED":
      return "Abgesagt";
    case "ARCHIVED":
      return "Archiviert";
    default:
      return status;
  }
}

export const scoutingEventTypeValues: ScoutingEventType[] = [
  "PHONE_CALL",
  "MATCH_OBSERVED",
  "TRAINING_TRIAL",
  "MEETING",
  "VIDEO_REVIEW",
  "OTHER",
];

export function scoutingEventTypeLabel(type: ScoutingEventType | string) {
  switch (type) {
    case "PHONE_CALL":
      return "Telefonat";
    case "MATCH_OBSERVED":
      return "Spiel beobachtet";
    case "TRAINING_TRIAL":
      return "Probetraining";
    case "MEETING":
      return "Treffen";
    case "VIDEO_REVIEW":
      return "Video-Sichtung";
    default:
      return "Sonstiges";
  }
}
