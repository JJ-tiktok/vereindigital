"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Trash2 } from "lucide-react";
import { useState } from "react";

import { deleteTacticSceneStep, duplicateTacticSceneStep, reorderTacticSceneSteps } from "@/lib/actions";

type Step = { id: string; label: string | null };

export function StepStrip({ sceneId, steps, activeStepId }: { sceneId: string; steps: Step[]; activeStepId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function moveStep(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= steps.length) {
      return;
    }
    const reordered = [...steps];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setPending("reorder");
    const formData = new FormData();
    formData.set("sceneId", sceneId);
    reordered.forEach((step) => formData.append("stepId", step.id));

    try {
      await reorderTacticSceneSteps(formData);
    } finally {
      setPending(null);
      router.refresh();
    }
  }

  async function handleDelete(stepId: string) {
    if (steps.length <= 1) {
      return;
    }
    setPending(stepId);
    const formData = new FormData();
    formData.set("sceneId", sceneId);
    formData.set("stepId", stepId);

    try {
      await deleteTacticSceneStep(formData);
    } finally {
      setPending(null);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3 shadow-sm">
      {steps.map((step, index) => (
        <div className="flex items-center gap-1" key={step.id}>
          <Link
            className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-bold transition ${
              step.id === activeStepId ? "border-primary bg-primary text-white" : "border-border bg-surface-muted text-foreground hover:border-primary"
            }`}
            href={`/taktik/szenen/${sceneId}?stepId=${step.id}`}
            title={step.label ?? `Schritt ${index + 1}`}
          >
            {index + 1}
          </Link>
          <div className="flex flex-col">
            <button
              className="flex h-4 w-4 items-center justify-center text-[10px] text-muted hover:text-foreground disabled:opacity-30"
              disabled={index === 0 || pending !== null}
              onClick={() => moveStep(index, -1)}
              title="Nach vorne verschieben"
              type="button"
            >
              &#9650;
            </button>
            <button
              className="flex h-4 w-4 items-center justify-center text-[10px] text-muted hover:text-foreground disabled:opacity-30"
              disabled={index === steps.length - 1 || pending !== null}
              onClick={() => moveStep(index, 1)}
              title="Nach hinten verschieben"
              type="button"
            >
              &#9660;
            </button>
          </div>
          {step.id === activeStepId ? (
            <button
              className="flex size-9 items-center justify-center rounded-lg border border-danger-soft text-danger transition hover:bg-danger-soft disabled:opacity-30"
              disabled={steps.length <= 1 || pending !== null}
              onClick={() => handleDelete(step.id)}
              title="Schritt loeschen"
              type="button"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ))}
      <form action={duplicateTacticSceneStep} className="contents">
        <input name="sceneId" type="hidden" value={sceneId} />
        <input name="stepId" type="hidden" value={activeStepId} />
        <button
          className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-muted px-3 text-sm font-semibold text-foreground transition hover:border-primary"
          title="Aktuellen Schritt duplizieren"
          type="submit"
        >
          <Copy className="size-4" aria-hidden="true" />
          Schritt
        </button>
      </form>
    </div>
  );
}
