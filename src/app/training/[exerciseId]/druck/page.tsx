import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { TrainingSketchPreview } from "@/components/training-sketch-preview";
import { requireActiveTeam, requireAppContext, requirePermission } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";
import {
  trainingCategoryLabel,
  trainingIntensityLabel,
  trainingPitchLabel,
  trainingVisibilityLabel,
} from "@/lib/training";

export default async function TrainingExercisePrintPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "training.catalog.read", activeTeam.id);
  const { exerciseId } = await params;
  const exercise = await prisma.trainingExercise.findFirst({
    where: {
      id: exerciseId,
      clubId: context.club.id,
      OR: [{ teamId: activeTeam.id }, { teamId: null }],
    },
    include: {
      team: true,
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

  const sketches = exercise.sketches.length > 0 ? exercise.sketches : null;

  return (
    <main className="min-h-screen bg-surface-muted px-4 py-6 text-foreground print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl rounded-2xl bg-surface p-8 shadow-sm print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground" href={`/training/${exercise.id}`}>
            Zurueck
          </Link>
          <PrintButton />
        </div>

        <header className="border-b border-border pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
            {trainingCategoryLabel(exercise.category)} / {trainingVisibilityLabel(exercise.visibility)}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">{exercise.title}</h1>
          {exercise.objective ? <p className="mt-3 text-lg font-semibold text-muted">{exercise.objective}</p> : null}
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
            <PrintInfo label="Dauer" value={exercise.durationMinutes ? `${exercise.durationMinutes} Min.` : "-"} />
            <PrintInfo label="Spieler" value={playerRange(exercise.minPlayers, exercise.maxPlayers)} />
            <PrintInfo label="Intensitaet" value={trainingIntensityLabel(exercise.intensity)} />
            <PrintInfo label="Feld" value={trainingPitchLabel(exercise.pitchType)} />
          </div>
        </header>

        <section className="grid gap-6 border-b border-border py-6 md:grid-cols-[280px_1fr]">
          {sketches ? (
            <div className="space-y-4">
              {sketches.map((sketch) => (
                <div className="break-inside-avoid" key={sketch.id}>
                  <TrainingSketchPreview fallbackPitch={sketch.pitchType} sketchData={sketch.sketchData} />
                  {sketch.title ? <p className="mt-2 text-center text-sm font-semibold text-muted">{sketch.title}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <TrainingSketchPreview fallbackPitch={exercise.pitchType} sketchData={exercise.sketchData} />
          )}

          <div>
            <PrintBlock title="Beschreibung" value={exercise.description} />
            <PrintBlock title="Organisation / Aufbau" value={exercise.organization} />
            <PrintBlock title="Ablauf" value={exercise.flow} />
            <PrintBlock title="Coaching Points" value={exercise.coachingPoints} />
            <PrintBlock title="Variationen" value={exercise.variations} />
            <PrintBlock title="Material" value={exercise.material} />
          </div>
        </section>
      </div>
    </main>
  );
}

function PrintInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function PrintBlock({ title, value }: { title: string; value: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <div className="mt-4 first:mt-0">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{title}</p>
      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

function playerRange(minPlayers: number | null, maxPlayers: number | null) {
  if (minPlayers && maxPlayers) {
    return `${minPlayers}-${maxPlayers}`;
  }

  if (minPlayers) {
    return `ab ${minPlayers}`;
  }

  if (maxPlayers) {
    return `bis ${maxPlayers}`;
  }

  return "-";
}
