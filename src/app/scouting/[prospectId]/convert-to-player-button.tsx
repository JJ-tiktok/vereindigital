"use client";

import { UserPlus } from "lucide-react";

export function ConvertToPlayerButton({ teamName }: { teamName: string }) {
  return (
    <button
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-strong"
      onClick={(event) => {
        if (!window.confirm(`Prospect wirklich als neuen Kaderspieler in "${teamName}" uebernehmen?`)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      <UserPlus className="size-4" aria-hidden="true" />
      In Kader uebernehmen
    </button>
  );
}
