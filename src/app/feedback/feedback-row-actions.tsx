"use client";

import { CheckCircle2, Trash2 } from "lucide-react";

import { deleteFeedbackItem, markFeedbackTriaged } from "@/lib/feedback-actions";
import { SubmitButton } from "@/components/submit-button";

export function FeedbackRowActions({ feedbackId, isNew }: { feedbackId: string; isNew: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
      {isNew ? (
        <form action={markFeedbackTriaged}>
          <input name="feedbackId" type="hidden" value={feedbackId} />
          <SubmitButton
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
            pendingLabel="..."
          >
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Als gelesen
          </SubmitButton>
        </form>
      ) : null}
      <form
        action={deleteFeedbackItem}
        onSubmit={(event) => {
          if (!window.confirm("Dieses Feedback wirklich loeschen?")) {
            event.preventDefault();
          }
        }}
      >
        <input name="feedbackId" type="hidden" value={feedbackId} />
        <SubmitButton
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-danger-soft px-2.5 text-xs font-semibold text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-60"
          pendingLabel="..."
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          Loeschen
        </SubmitButton>
      </form>
    </div>
  );
}
