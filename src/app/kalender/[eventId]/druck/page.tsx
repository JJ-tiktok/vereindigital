import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { TrainingSketchPreview } from "@/components/training-sketch-preview";
import { requireActiveTeam, requireAppContext, requireCoachingStaffTeam } from "@/lib/app-context";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { trainingCategoryLabel, trainingIntensityLabel } from "@/lib/training";

export default async function TrainingPlanPrintPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const { eventId } = await params;
  const event = await prisma.calendarEvent.findFirst({
    where: {
      id: eventId,
      teamId: activeTeam.id,
      type: "TRAINING",
    },
    include: {
      trainingPlan: {
        include: {
          exercises: {
            include: {
              trainingExercise: {
                include: {
                  sketches: {
                    orderBy: {
                      sortOrder: "asc",
                    },
                    take: 1,
                  },
                },
              },
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const totalDuration =
    event.trainingPlan?.exercises.reduce(
      (sum, planExercise) => sum + (planExercise.durationMinutes ?? planExercise.trainingExercise.durationMinutes ?? 0),
      0,
    ) ?? 0;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-slate-700" href={`/kalender/${event.id}`}>
            Zurueck
          </Link>
          <PrintButton />
        </div>

        <header className="border-b border-slate-300 pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700">Trainingsplan</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">{event.title}</h1>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <PrintInfo label="Team" value={activeTeam.name} />
            <PrintInfo label="Termin" value={`${formatDateTime(event.startsAt)} bis ${formatDateTime(event.endsAt)}`} />
            <PrintInfo label="Ort" value={event.location ?? "-"} />
          </div>
        </header>

        <section className="grid gap-4 border-b border-slate-300 py-6 md:grid-cols-[1fr_220px]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Ziel der Einheit</p>
            <p className="mt-2 text-lg font-semibold">{event.trainingPlan?.objective || "Noch kein Ziel hinterlegt."}</p>
            {event.trainingPlan?.notes ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{event.trainingPlan.notes}</p> : null}
          </div>
          <div className="rounded-xl bg-slate-100 p-4 print:bg-slate-50">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Umfang</p>
            <p className="mt-2 text-3xl font-black">{totalDuration || "-"} Min.</p>
            <p className="mt-1 text-sm text-slate-600">{event.trainingPlan?.exercises.length ?? 0} Uebungen</p>
          </div>
        </section>

        <section className="space-y-6 py-6">
          {event.trainingPlan?.exercises.length ? (
            event.trainingPlan.exercises.map((planExercise, index) => (
              <article className="break-inside-avoid rounded-xl border border-slate-300 p-4" key={planExercise.id}>
                <div className="grid gap-5 md:grid-cols-[280px_1fr]">
                  <TrainingSketchPreview
                    fallbackPitch={planExercise.trainingExercise.sketches[0]?.pitchType ?? planExercise.trainingExercise.pitchType}
                    sketchData={planExercise.trainingExercise.sketches[0]?.sketchData ?? planExercise.trainingExercise.sketchData}
                  />
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Teil {index + 1}</p>
                        <h2 className="mt-1 text-2xl font-black">{planExercise.trainingExercise.title}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {trainingCategoryLabel(planExercise.trainingExercise.category)} /{" "}
                          {trainingIntensityLabel(planExercise.trainingExercise.intensity)}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">
                        {planExercise.durationMinutes ?? planExercise.trainingExercise.durationMinutes ?? "-"} Min.
                      </span>
                    </div>

                    <PrintBlock title="Organisation" value={planExercise.trainingExercise.organization} />
                    <PrintBlock title="Ablauf" value={planExercise.trainingExercise.flow} />
                    <PrintBlock
                      title="Coaching Points"
                      value={planExercise.coachingPoints || planExercise.trainingExercise.coachingPoints}
                    />
                    <PrintBlock title="Material" value={planExercise.trainingExercise.material} />
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
              Noch keine Uebungen im Trainingsplan.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function PrintInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function PrintBlock({ title, value }: { title: string; value: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <div className="mt-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}
