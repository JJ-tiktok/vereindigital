import { Clock, Copy, Edit, Flag, PencilRuler, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell, PageHeader } from "@/components/app-shell";
import { TrainingSketchPreview } from "@/components/training-sketch-preview";
import { duplicateTrainingExercise } from "@/lib/actions";
import { requireActiveTeam, requireAppContext, requireCoachingStaffTeam } from "@/lib/app-context";
import {
  trainingCategoryLabel,
  trainingIntensityLabel,
  trainingPitchLabel,
  trainingVisibilityLabel,
} from "@/lib/training";
import { prisma } from "@/lib/prisma";

export default async function TrainingExerciseDetailPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const { exerciseId } = await params;
  const exercise = await prisma.trainingExercise.findFirst({
    where: {
      id: exerciseId,
      clubId: context.club.id,
      OR: [{ teamId: activeTeam.id }, { teamId: null }],
    },
    include: {
      createdByUser: true,
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
  const previewSketch = exercise.sketches[0];
  const hasSketch = exercise.sketches.length > 0 || Boolean(exercise.sketchData);

  return (
    <AppShell context={context} activePath="/training">
      <PageHeader
        eyebrow={trainingCategoryLabel(exercise.category)}
        title={exercise.title}
        description={exercise.objective ?? "Trainingsform aus der Bibliothek."}
        action={
          <>
            <form action={duplicateTrainingExercise}>
              <input name="exerciseId" type="hidden" value={exercise.id} />
              <button
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-slate-700"
                type="submit"
              >
                <Copy className="size-4" aria-hidden="true" />
                Duplizieren
              </button>
            </form>
            <Link
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-slate-700"
              href={`/training/${exercise.id}/skizze`}
            >
              <PencilRuler className="size-4" aria-hidden="true" />
              Skizze
            </Link>
            <Link
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
              href={`/training/${exercise.id}/edit`}
            >
              <Edit className="size-4" aria-hidden="true" />
              Bearbeiten
            </Link>
          </>
        }
      />

      <div className="grid gap-6 py-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-white p-5">
            <div className="grid gap-4 md:grid-cols-4">
              <Metric icon={<Clock className="size-4" />} label="Dauer" value={exercise.durationMinutes ? `${exercise.durationMinutes} Min.` : "-"} />
              <Metric icon={<Users className="size-4" />} label="Spieler" value={playerRange(exercise.minPlayers, exercise.maxPlayers)} />
              <Metric icon={<Flag className="size-4" />} label="Intensitaet" value={trainingIntensityLabel(exercise.intensity)} />
              <Metric label="Feld" value={trainingPitchLabel(exercise.pitchType)} />
            </div>
          </section>

          <TextSection title="Beschreibung" value={exercise.description} />
          <TextSection title="Organisation / Aufbau" value={exercise.organization} />
          <TextSection title="Ablauf" value={exercise.flow} />
          <TextSection title="Coaching Points" value={exercise.coachingPoints} />
          <TextSection title="Variationen" value={exercise.variations} />
        </div>

        <aside className="space-y-6">
          <article className="rounded-lg border border-border bg-white p-5">
            <p className="text-xs font-semibold uppercase text-muted">Katalog</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">{trainingVisibilityLabel(exercise.visibility)}</h2>
            <p className="mt-2 text-sm text-muted">
              {exercise.team ? exercise.team.name : "Vereinsweit fuer alle Teams"}
            </p>
          </article>

          <article className="rounded-lg border border-border bg-white p-5">
            <p className="text-xs font-semibold uppercase text-muted">Material</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
              {exercise.material || "Noch kein Material hinterlegt."}
            </p>
          </article>

          <article className="rounded-lg border border-border bg-white p-5">
            <p className="text-xs font-semibold uppercase text-muted">Skizze</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              {exercise.sketches.length > 0
                ? `${exercise.sketches.length} Skizzen vorhanden`
                : hasSketch
                  ? "Skizze vorhanden"
                  : "Noch keine Skizze"}
            </h2>
            <div className="mt-4">
              <TrainingSketchPreview
                fallbackPitch={previewSketch?.pitchType ?? exercise.pitchType}
                sketchData={previewSketch?.sketchData ?? exercise.sketchData}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              Feldtyp: {trainingPitchLabel(previewSketch?.pitchType ?? exercise.pitchType)}. Skizzen bleiben editierbar und werden als JSON gespeichert.
            </p>
            <Link
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white"
              href={`/training/${exercise.id}/skizze`}
            >
              Skizze bearbeiten
            </Link>
          </article>
        </aside>
      </div>
    </AppShell>
  );
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

function TextSection({ title, value }: { title: string; value: string | null }) {
  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">{value || "Noch nicht beschrieben."}</p>
    </section>
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
