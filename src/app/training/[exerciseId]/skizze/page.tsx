import { notFound } from "next/navigation";
import Link from "next/link";

import { SketchCanvasPanel, SketchEditorProvider, SketchToolPanel } from "@/app/training/[exerciseId]/sketch-editor";
import { AppShell, Breadcrumbs, PageHeader } from "@/components/app-shell";
import { TrainingSketchPreview } from "@/components/training-sketch-preview";
import { createTrainingExerciseSketch, deleteTrainingExerciseSketch } from "@/lib/actions";
import { requireActiveTeam, requireAppContext, requirePermission } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";
import { trainingPitchLabel } from "@/lib/training";

export default async function TrainingSketchPage({
  params,
  searchParams,
}: {
  params: Promise<{ exerciseId: string }>;
  searchParams: Promise<{ sketchId?: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "training.catalog.manage", activeTeam.id);
  const { exerciseId } = await params;
  const query = await searchParams;
  const exercise = await prisma.trainingExercise.findFirst({
    where: {
      id: exerciseId,
      clubId: context.club.id,
      OR: [{ teamId: activeTeam.id }, { teamId: null }],
    },
    include: {
      sketches: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!exercise) {
    notFound();
  }
  const activeSketch = query.sketchId
    ? exercise.sketches.find((sketch) => sketch.id === query.sketchId) ?? exercise.sketches[0]
    : exercise.sketches[0];
  const fallbackSketch = activeSketch
    ? null
    : {
        id: null,
        title: "Skizze 1",
        pitchType: exercise.pitchType,
        sketchData: exercise.sketchData,
      };
  const editorSketch = activeSketch ?? fallbackSketch;

  return (
    <AppShell context={context} activePath="/training">
      <Breadcrumbs
        items={[
          { label: "Training", href: "/training" },
          { label: exercise.title, href: `/training/${exercise.id}` },
          { label: "Skizzen-Editor" },
        ]}
      />
      <PageHeader
        eyebrow="Skizzen-Editor"
        title={exercise.title}
        description="Mehrere Skizzen, Phasen oder Varianten pro Uebung anlegen und bearbeiten."
      />
      <div className="grid gap-5 py-6 lg:grid-cols-[260px_1fr] lg:items-start">
        <SketchEditorProvider
          exerciseId={exercise.id}
          sketchId={editorSketch?.id ?? null}
          initialTitle={editorSketch?.title ?? "Skizze 1"}
          initialPitch={editorSketch?.pitchType ?? exercise.pitchType}
          initialSketch={parseSketchData(editorSketch?.sketchData)}
        >
          <aside className="space-y-3">
            <article className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Skizzen</p>
                {activeSketch ? (
                  <form action={deleteTrainingExerciseSketch}>
                    <input name="exerciseId" type="hidden" value={exercise.id} />
                    <input name="sketchId" type="hidden" value={activeSketch.id} />
                    <button className="text-xs font-semibold text-danger hover:text-danger-strong" type="submit">
                      Loeschen
                    </button>
                  </form>
                ) : null}
              </div>
              <div className="mt-2 space-y-2">
                {exercise.sketches.length > 0 ? (
                  exercise.sketches.map((sketch) => (
                    <Link
                      className={`flex items-center gap-2.5 rounded-xl border p-2 transition ${
                        sketch.id === activeSketch?.id
                          ? "border-primary bg-primary-soft"
                          : "border-border bg-surface hover:border-primary"
                      }`}
                      href={`/training/${exercise.id}/skizze?sketchId=${sketch.id}`}
                      key={sketch.id}
                    >
                      <div className="w-11 shrink-0">
                        <TrainingSketchPreview compact fallbackPitch={sketch.pitchType} sketchData={sketch.sketchData} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{sketch.title}</p>
                        <p className="truncate text-xs text-muted">{trainingPitchLabel(sketch.pitchType)}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-2.5 text-xs text-muted">
                    Noch keine separate Skizze. Beim Speichern wird die erste Skizze angelegt.
                  </div>
                )}
              </div>
              <form action={createTrainingExerciseSketch} className="mt-2 flex gap-2">
                <input name="exerciseId" type="hidden" value={exercise.id} />
                <input name="pitchType" type="hidden" value={activeSketch?.pitchType ?? exercise.pitchType} />
                <input
                  className="h-9 min-w-0 flex-1 rounded-lg border border-border px-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                  name="title"
                  placeholder="z.B. Phase 2"
                />
                <button className="h-9 shrink-0 rounded-lg bg-primary px-3 text-sm font-bold text-white" type="submit">
                  +
                </button>
              </form>
            </article>

            <SketchToolPanel />
          </aside>

          <SketchCanvasPanel />
        </SketchEditorProvider>
      </div>
    </AppShell>
  );
}

function parseSketchData(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const sketch = value as { elements?: unknown; pitch?: unknown };

  if (!Array.isArray(sketch.elements) || typeof sketch.pitch !== "string") {
    return null;
  }

  return {
    elements: sketch.elements,
    pitch: sketch.pitch,
  } as {
    elements: never[];
    pitch: string;
  };
}
