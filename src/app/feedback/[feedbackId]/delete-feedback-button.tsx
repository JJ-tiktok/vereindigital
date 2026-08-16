"use client";

import { Trash2 } from "lucide-react";

import { deleteFeedbackItem } from "@/lib/feedback-actions";
import { SubmitButton } from "@/components/submit-button";

export function DeleteFeedbackButton({ feedbackId }: { feedbackId: string }) {
  return (
    <form
      action={deleteFeedbackItem}
      className="rounded-lg border border-danger-soft bg-surface p-5"
      onSubmit={(event) => {
        if (!window.confirm("Dieses Feedback wirklich loeschen?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="feedbackId" type="hidden" value={feedbackId} />
      <SubmitButton
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-danger-soft px-4 text-sm font-semibold text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-60"
        pendingLabel="Wird geloescht..."
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Feedback loeschen
      </SubmitButton>
    </form>
  );
}
