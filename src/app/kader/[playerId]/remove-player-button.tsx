"use client";

import { Trash2 } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";

export function RemovePlayerButton() {
  return (
    <SubmitButton
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white transition hover:bg-danger-strong disabled:cursor-not-allowed disabled:opacity-60"
      onClick={(event) => {
        if (!window.confirm("Spieler wirklich aus dem aktuellen Kader entfernen?")) {
          event.preventDefault();
        }
      }}
      pendingLabel="Wird entfernt..."
    >
      <Trash2 className="size-4" aria-hidden="true" />
      Aus Kader entfernen
    </SubmitButton>
  );
}
