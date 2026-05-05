import {
  TrainingExerciseCategory,
  TrainingExerciseVisibility,
  TrainingIntensity,
  TrainingPitchType,
} from "@prisma/client";

export function trainingCategoryLabel(category: TrainingExerciseCategory) {
  switch (category) {
    case "WARMUP":
      return "Aufwaermen";
    case "TECHNIQUE":
      return "Technik";
    case "TACTICS":
      return "Taktik";
    case "CONDITIONING":
      return "Kondition";
    case "FINISHING":
      return "Torabschluss";
    case "GAME_FORM":
      return "Spielform";
    case "COOLDOWN":
      return "Cooldown";
    default:
      return "Sonstiges";
  }
}

export function trainingIntensityLabel(intensity: TrainingIntensity | null) {
  switch (intensity) {
    case "LOW":
      return "Niedrig";
    case "MEDIUM":
      return "Mittel";
    case "HIGH":
      return "Hoch";
    default:
      return "Offen";
  }
}

export function trainingVisibilityLabel(visibility: TrainingExerciseVisibility) {
  switch (visibility) {
    case "CLUB":
      return "Vereinsweit";
    default:
      return "Team";
  }
}

export function trainingPitchLabel(pitchType: TrainingPitchType) {
  switch (pitchType) {
    case "FULL_FIELD":
      return "Ganzes Feld";
    case "HALF_FIELD":
      return "Halbes Feld";
    case "PENALTY_AREA":
      return "Strafraum / 16er";
    case "SMALL_FIELD":
      return "Kleinfeld";
    default:
      return "Freie Flaeche";
  }
}

export const trainingCategoryOptions = Object.values(TrainingExerciseCategory);
export const trainingIntensityOptions = Object.values(TrainingIntensity);
export const trainingPitchOptions = Object.values(TrainingPitchType);
export const trainingVisibilityOptions = Object.values(TrainingExerciseVisibility);
