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
