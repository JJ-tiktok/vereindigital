import { Plus, Search } from "lucide-react";
import Link from "next/link";

import { AppShell, EmptyState, PageHeader } from "@/components/app-shell";
import { TrainingSketchPreview } from "@/components/training-sketch-preview";
import { requireActiveTeam, requireAppContext, requireCoachingStaffTeam } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";
import {
  trainingCategoryLabel,
  trainingCategoryOptions,
  trainingIntensityLabel,
  trainingIntensityOptions,
  trainingPitchLabel,
  trainingVisibilityLabel,
} from "@/lib/training";
import type { Prisma, TrainingExerciseCategory, TrainingIntensity } from "@prisma/client";

type TrainingExerciseCardValue = Prisma.TrainingExerciseGetPayload<{
  include: {
    sketches: true;
  };
}>;

export default async function TrainingLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; intensity?: string; q?: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const query = await searchParams;
  const search = query.q?.trim() ?? "";
  const category = isTrainingCategory(query.category) ? query.category : "";
  const intensity = isTrainingIntensity(query.intensity) ? query.intensity : "";
  const exercises = await prisma.trainingExercise.findMany({
    where: {
      clubId: context.club.id,
      AND: [
        {
          OR: [{ teamId: activeTeam.id }, { teamId: null }],
        },
        ...(search
          ? [
              {
                OR: [
                  { title: { contains: search, mode: "insensitive" as const } },
                  { objective: { contains: search, mode: "insensitive" as const } },
                  { description: { contains: search, mode: "insensitive" as const } },
                ],
              },
            ]
          : []),
      ],
      ...(category ? { category } : {}),
      ...(intensity ? { intensity } : {}),
    },
    include: {
      team: true,
      sketches: {
        orderBy: {
          sortOrder: "asc",
        },
        take: 1,
      },
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
  });
  const categoryCounts = trainingCategoryOptions.map((option) => ({
    label: trainingCategoryLabel(option),
    value: exercises.filter((exercise) => exercise.category === option).length,
  }));

  return (
    <AppShell context={context} activePath="/training">
      <PageHeader
        eyebrow="Trainingsbibliothek"
        title="Uebungskatalog"
        description="Wiederverwendbare Trainingsformen mit Aufbau, Ablauf, Coaching Points und Feldvorlage."
        action={
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-strong"
            href="/training/new"
          >
            <Plus className="size-4" aria-hidden="true" />
            Uebung anlegen
          </Link>
        }
      />

      <section className="grid gap-6 py-6 xl:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <article className="rounded-lg border border-border bg-white p-5">
            <p className="text-xs font-semibold uppercase text-muted">Bibliothek</p>
            <p className="mt-3 text-4xl font-bold tabular-nums text-slate-950">{exercises.length}</p>
            <p className="mt-1 text-sm text-muted">gefilterte Uebungen</p>
          </article>
          <article className="rounded-lg border border-border bg-white p-5">
            <p className="text-sm font-semibold text-slate-950">Kategorien</p>
            <div className="mt-4 space-y-3">
              {categoryCounts.map((item) => (
                <div className="flex items-center justify-between text-sm" key={item.label}>
                  <span className="text-muted">{item.label}</span>
                  <span className="font-semibold tabular-nums text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </article>
        </aside>

        <div className="space-y-5">
          <form className="grid gap-3 rounded-lg border border-border bg-white p-4 lg:grid-cols-[1fr_180px_180px_120px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                className="h-11 w-full rounded-lg border border-border pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
                defaultValue={search}
                name="q"
                placeholder="Uebung oder Schwerpunkt suchen..."
              />
            </label>
            <select className="h-11 rounded-lg border border-border px-3 text-sm" defaultValue={category} name="category">
              <option value="">Alle Kategorien</option>
              {trainingCategoryOptions.map((option) => (
                <option key={option} value={option}>
                  {trainingCategoryLabel(option)}
                </option>
              ))}
            </select>
            <select className="h-11 rounded-lg border border-border px-3 text-sm" defaultValue={intensity} name="intensity">
              <option value="">Alle Intensitaeten</option>
              {trainingIntensityOptions.map((option) => (
                <option key={option} value={option}>
                  {trainingIntensityLabel(option)}
                </option>
              ))}
            </select>
            <button className="h-11 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
              Filtern
            </button>
          </form>

          {exercises.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {exercises.map((exercise) => (
                <TrainingExerciseCard exercise={exercise} key={exercise.id} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Noch keine Uebungen"
              description="Lege die erste Trainingsform an. Danach kannst du den Katalog nach Kategorie, Intensitaet und Schwerpunkt filtern."
              action={
                <Link
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                  href="/training/new"
                >
                  Uebung anlegen
                </Link>
              }
            />
          )}
        </div>
      </section>
    </AppShell>
  );
}

function TrainingExerciseCard({
  exercise,
}: {
  exercise: TrainingExerciseCardValue;
}) {
  const previewSketch = exercise.sketches[0];

  return (
    <Link
      className="overflow-hidden rounded-lg border border-border bg-white transition hover:-translate-y-0.5 hover:shadow-sm"
      href={`/training/${exercise.id}`}
    >
      <TrainingSketchPreview
        compact
        fallbackPitch={previewSketch?.pitchType ?? exercise.pitchType}
        sketchData={previewSketch?.sketchData ?? exercise.sketchData}
      />
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
            {trainingCategoryLabel(exercise.category)}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {trainingIntensityLabel(exercise.intensity)}
          </span>
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-950">{exercise.title}</h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
          {exercise.objective || exercise.description || "Noch keine Beschreibung hinterlegt."}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Info label="Dauer" value={exercise.durationMinutes ? `${exercise.durationMinutes} Min.` : "-"} />
          <Info label="Spieler" value={playerRange(exercise.minPlayers, exercise.maxPlayers)} />
          <Info label="Feld" value={trainingPitchLabel(previewSketch?.pitchType ?? exercise.pitchType)} />
          <Info label="Sichtbarkeit" value={trainingVisibilityLabel(exercise.visibility)} />
        </div>
      </div>
    </Link>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
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

function isTrainingCategory(value?: string): value is TrainingExerciseCategory {
  return trainingCategoryOptions.includes(value as TrainingExerciseCategory);
}

function isTrainingIntensity(value?: string): value is TrainingIntensity {
  return trainingIntensityOptions.includes(value as TrainingIntensity);
}
