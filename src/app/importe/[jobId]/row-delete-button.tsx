"use client";

import { Trash2 } from "lucide-react";

export function RowDeleteButton({ skipInputId }: { skipInputId: string }) {
  return (
    <button
      className="inline-flex size-9 items-center justify-center rounded-lg border border-danger-soft bg-danger-soft text-danger transition hover:bg-rose-100"
      onClick={(event) => {
        const input = document.getElementById(skipInputId);
        const row = event.currentTarget.closest("tr");

        if (input instanceof HTMLInputElement) {
          input.value = "true";
        }

        if (row) {
          row.querySelectorAll("input, select, textarea").forEach((field) => {
            if (field !== input && "disabled" in field) {
              field.disabled = true;
            }
          });
          row.classList.add("hidden");
        }
      }}
      title="Zeile entfernen"
      type="button"
    >
      <Trash2 className="size-4" aria-hidden="true" />
      <span className="sr-only">Zeile entfernen</span>
    </button>
  );
}
