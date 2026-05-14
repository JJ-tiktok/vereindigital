import { ArrowLeft, Layers, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SketchEditor } from "@/app/training/[exerciseId]/sketch-editor";
import { createTrainingExerciseSketch, deleteTrainingExerciseSketch } from "@/lib/actions";
import { requireActiveTeam, requireAppContext, requireCoachingStaffTeam } from "@/lib/app-context";
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
  requireCoachingStaffTeam(context, activeTeam.id);
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
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-3 px-4 py-3 lg:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-slate-700 transition hover:bg-slate-50"
                href={`/training/${exercise.id}`}
                aria-label="Zurueck zur Uebung"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Link>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Skizzen-Workspace</p>
                <h1 className="truncate text-xl font-bold text-slate-950 sm:text-2xl">{exercise.title}</h1>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <form action={createTrainingExerciseSketch} className="flex min-w-0 gap-2">
                <input name="exerciseId" type="hidden" value={exercise.id} />
                <input name="pitchType" type="hidden" value={activeSketch?.pitchType ?? exercise.pitchType} />
                <input
                  className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100 sm:w-44"
                  name="title"
                  placeholder="Neue Phase"
                />
                <button
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-bold text-white transition hover:bg-primary-strong"
                  type="submit"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Skizze</span>
                </button>
              </form>

              {activeSketch ? (
                <form action={deleteTrainingExerciseSketch}>
                  <input name="exerciseId" type="hidden" value={exercise.id} />
                  <input name="sketchId" type="hidden" value={activeSketch.id} />
                  <button
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-bold text-red-700 transition hover:bg-red-50 sm:w-auto"
                    type="submit"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Loeschen
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1">
            {exercise.sketches.length > 0 ? (
              exercise.sketches.map((sketch) => (
                <Link
                  className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-bold transition ${
                    sketch.id === activeSketch?.id
                      ? "border-blue-200 bg-blue-50 text-primary"
                      : "border-border bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  href={`/training/${exercise.id}/skizze?sketchId=${sketch.id}`}
                  key={sketch.id}
                >
                  <Layers className="size-4" aria-hidden="true" />
                  {sketch.title}
                  <span className="hidden rounded-full bg-white px-2 py-0.5 text-xs text-muted sm:inline">
                    {trainingPitchLabel(sketch.pitchType)}
                  </span>
                </Link>
              ))
            ) : (
              <div className="inline-flex h-11 items-center gap-2 rounded-lg border border-dashed border-border bg-white px-3 text-sm font-semibold text-muted">
                <Layers className="size-4" aria-hidden="true" />
                Erste Skizze wird beim Speichern angelegt
              </div>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1800px] px-4 py-4 lg:px-6">
        <SketchEditor
          exerciseId={exercise.id}
          key={editorSketch?.id ?? "fallback-sketch"}
          sketchId={editorSketch?.id ?? null}
          initialTitle={editorSketch?.title ?? "Skizze 1"}
          initialPitch={editorSketch?.pitchType ?? exercise.pitchType}
          initialSketch={parseSketchData(editorSketch?.sketchData)}
        />
      </div>
    </main>
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
