import { FeedbackPriority, FeedbackStatus, FeedbackType } from "@prisma/client";

export function feedbackTypeLabel(value: FeedbackType) {
  const labels: Record<FeedbackType, string> = {
    BUG: "Bug",
    FEATURE_REQUEST: "Feature Request",
    IMPROVEMENT: "Verbesserung",
    OTHER: "Sonstiges",
  };

  return labels[value];
}

export function feedbackStatusLabel(value: FeedbackStatus) {
  const labels: Record<FeedbackStatus, string> = {
    DONE: "Erledigt",
    IN_PROGRESS: "In Arbeit",
    NEW: "Neu",
    TRIAGED: "Geprueft",
    WONT_DO: "Nicht geplant",
  };

  return labels[value];
}

export function feedbackPriorityLabel(value: FeedbackPriority) {
  const labels: Record<FeedbackPriority, string> = {
    HIGH: "Hoch",
    LOW: "Niedrig",
    MEDIUM: "Normal",
  };

  return labels[value];
}

export function feedbackStatusClass(value: FeedbackStatus) {
  if (value === "DONE") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (value === "IN_PROGRESS") {
    return "bg-blue-50 text-primary";
  }

  if (value === "WONT_DO") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-amber-50 text-amber-700";
}

export function feedbackPriorityClass(value: FeedbackPriority) {
  if (value === "HIGH") {
    return "bg-rose-50 text-rose-700";
  }

  if (value === "LOW") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-blue-50 text-primary";
}
