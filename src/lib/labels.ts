export function eventTypeLabel(type: string) {
  switch (type) {
    case "TRAINING":
      return "Training";
    case "MATCH":
      return "Spiel";
    case "TEAM_EVENT":
      return "Team-Event";
    default:
      return "Sonstiges";
  }
}

export function matchCompetitionLabel(competition: string) {
  switch (competition) {
    case "LEAGUE":
      return "Liga";
    case "CUP":
      return "Pokal";
    case "FRIENDLY":
      return "Freundschaftsspiel";
    default:
      return "Sonstiges";
  }
}

export function tacticSceneCategoryLabel(category: string) {
  switch (category) {
    case "STANDARDS":
      return "Standards";
    case "DEFENSE":
      return "Verteidigung";
    case "ATTACK":
      return "Angriff";
    case "MATCH_SCENE":
      return "Spielszene";
    default:
      return "Sonstiges";
  }
}
