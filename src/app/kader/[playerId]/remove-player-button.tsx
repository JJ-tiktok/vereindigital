"use client";

import { Trash2 } from "lucide-react";

export function RemovePlayerButton() {
  return (
    <button
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white transition hover:bg-danger-strong"
      onClick={(event) => {
        if (!window.confirm("Spieler wirklich aus dem aktuellen Kader entfernen?")) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      <Trash2 className="size-4" aria-hidden="true" />
      Aus Kader entfernen
    </button>
  );
}
