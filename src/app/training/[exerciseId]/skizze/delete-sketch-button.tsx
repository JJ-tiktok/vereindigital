"use client";

import { SubmitButton } from "@/components/submit-button";
import { deleteTrainingExerciseSketch } from "@/lib/actions";

export function DeleteSketchButton({ exerciseId, sketchId }: { exerciseId: string; sketchId: string }) {
  return (
    <form
      action={deleteTrainingExerciseSketch}
      onSubmit={(event) => {
        if (!window.confirm("Diese Skizze wirklich loeschen?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="exerciseId" type="hidden" value={exerciseId} />
      <input name="sketchId" type="hidden" value={sketchId} />
      <SubmitButton className="text-xs font-semibold text-danger hover:text-danger-strong disabled:cursor-not-allowed disabled:opacity-60" pendingLabel="...">
        Loeschen
      </SubmitButton>
    </form>
  );
}
