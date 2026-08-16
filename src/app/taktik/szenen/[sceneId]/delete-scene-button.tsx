"use client";

import { SubmitButton } from "@/components/submit-button";
import { deleteTacticScene } from "@/lib/actions";

export function DeleteSceneButton({ sceneId }: { sceneId: string }) {
  return (
    <form
      action={deleteTacticScene}
      onSubmit={(event) => {
        if (!window.confirm("Diese Szene wirklich loeschen?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="sceneId" type="hidden" value={sceneId} />
      <SubmitButton
        className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-danger-soft px-4 text-sm font-semibold text-danger disabled:cursor-not-allowed disabled:opacity-60"
        pendingLabel="Wird geloescht..."
      >
        Szene loeschen
      </SubmitButton>
    </form>
  );
}
