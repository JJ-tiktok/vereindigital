import { notFound } from "next/navigation";
import Link from "next/link";

import { SketchEditor } from "@/app/training/[exerciseId]/sketch-editor";
import { AppShell, PageHeader } from "@/components/app-shell";
import { TrainingSketchPreview } from "@/components/training-sketch-preview";
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
    <AppShell context={context} activePath="/training">
      <PageHeader
        eyebrow="Skizzen-Editor"
        title={exercise.title}
        description="Mehrere Skizzen, Phasen oder Varianten pro Uebung anlegen und bearbeiten."
      />
      <div className="grid gap-5 py-6 xl:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Skizzen</p>
            <div className="mt-3 space-y-3">
              {exercise.sketches.length > 0 ? (
                exercise.sketches.map((sketch) => (
                  <Link
                    className={`block rounded-xl border p-3 transition ${
                      sketch.id === activeSketch?.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                    href={`/training/${exercise.id}/skizze?sketchId=${sketch.id}`}
                    key={sketch.id}
                  >
                    <TrainingSketchPreview compact fallbackPitch={sketch.pitchType} sketchData={sketch.sketchData} />
                    <p className="mt-2 font-bold text-slate-950">{sketch.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{trainingPitchLabel(sketch.pitchType)}</p>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                  Noch keine separate Skizze. Beim Speichern wird die erste Skizze angelegt.
                </div>
              )}
            </div>
          </article>

          <form action={createTrainingExerciseSketch} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <input name="exerciseId" type="hidden" value={exercise.id} />
            <input name="pitchType" type="hidden" value={activeSketch?.pitchType ?? exercise.pitchType} />
            <p className="text-sm font-bold text-slate-950">Neue Skizze</p>
            <input
              className="mt-3 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              name="title"
              placeholder="z.B. Phase 2"
            />
            <button className="mt-3 h-10 w-full rounded-xl bg-blue-600 px-4 text-sm font-bold text-white" type="submit">
              Skizze anlegen
            </button>
          </form>

          {activeSketch ? (
            <form action={deleteTrainingExerciseSketch} className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <input name="exerciseId" type="hidden" value={exercise.id} />
              <input name="sketchId" type="hidden" value={activeSketch.id} />
              <p className="text-sm font-bold text-red-950">Aktive Skizze loeschen</p>
              <p className="mt-1 text-xs leading-5 text-red-700">Diese Skizze wird dauerhaft entfernt.</p>
              <button className="mt-3 h-10 w-full rounded-xl bg-red-600 px-4 text-sm font-bold text-white" type="submit">
                Loeschen
              </button>
            </form>
          ) : null}
        </aside>

        <SketchEditor
          exerciseId={exercise.id}
          sketchId={editorSketch?.id ?? null}
          initialTitle={editorSketch?.title ?? "Skizze 1"}
          initialPitch={editorSketch?.pitchType ?? exercise.pitchType}
          initialSketch={parseSketchData(editorSketch?.sketchData)}
        />
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
