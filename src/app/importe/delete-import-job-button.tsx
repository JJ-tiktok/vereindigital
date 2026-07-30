"use client";

import { Trash2 } from "lucide-react";

import { deleteImportJob } from "@/lib/import-actions";

export function DeleteImportJobButton({ jobId }: { jobId: string }) {
  return (
    <form
      action={deleteImportJob}
      onSubmit={(event) => {
        if (!window.confirm("Diesen Importjob wirklich loeschen?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="jobId" type="hidden" value={jobId} />
      <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-danger-soft px-3 text-sm font-semibold text-danger transition hover:bg-danger-soft" type="submit">
        <Trash2 className="size-4" aria-hidden="true" />
        Loeschen
      </button>
    </form>
  );
}
