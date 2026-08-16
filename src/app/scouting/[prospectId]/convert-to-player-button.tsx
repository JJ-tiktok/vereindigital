"use client";

import { UserPlus } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";

export function ConvertToPlayerButton({ teamName }: { teamName: string }) {
  return (
    <SubmitButton
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
      onClick={(event) => {
        if (!window.confirm(`Prospect wirklich als neuen Kaderspieler in "${teamName}" uebernehmen?`)) {
          event.preventDefault();
        }
      }}
      pendingLabel="Wird uebernommen..."
    >
      <UserPlus className="size-4" aria-hidden="true" />
      In Kader uebernehmen
    </SubmitButton>
  );
}
