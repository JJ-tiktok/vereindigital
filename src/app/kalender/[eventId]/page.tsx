import { notFound } from "next/navigation";
import Link from "next/link";
import { Edit, Printer } from "lucide-react";

import { AppShell, Breadcrumbs, EmptyState, PageHeader } from "@/components/app-shell";
import { AttendancePanel } from "@/app/kalender/[eventId]/attendance-panel";
import { TrainingPerformanceTable } from "@/app/kalender/[eventId]/training-performance-table";
import { PlayerTabs } from "@/components/player-tabs";
import { addExerciseToTrainingPlan, upsertTrainingPlan } from "@/lib/actions";
import { hasPermission, requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { formatDateTime } from "@/lib/format";
import { eventTypeLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { trainingCategoryLabel, trainingIntensityLabel } from "@/lib/training";

export default async function CalendarEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const { eventId } = await params;
  const query = await searchParams;
  const event = await prisma.calendarEvent.findFirst({
    where: {
      id: eventId,
      teamId: activeTeam.id,
    },
    include: {
      attendances: true,
      match: true,
      trainingPerformances: true,
      trainingPlan: {
        include: {
          exercises: {
            include: {
              trainingExercise: true,
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

  const players = await prisma.playerProfile.findMany({
    where: {
      memberships: {
        some: {
          teamId: activeTeam.id,
          status: "ACTIVE",
          role: {
            key: "player",
          },
        },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const attendanceByPlayer = new Map(event.attendances.map((attendance) => [attendance.playerProfileId, attendance]));
  const presentPlayers = players.filter((player) => attendanceByPlayer.get(player.id)?.status === "ACCEPTED");
  const trainingPerformanceByPlayer = new Map(
    event.trainingPerformances.map((performance) => [performance.playerProfileId, performance]),
  );
  const catalogExercises =
    event.type === "TRAINING"
      ? await prisma.trainingExercise.findMany({
          where: {
            clubId: context.club.id,
            OR: [{ teamId: activeTeam.id }, { teamId: null }],
          },
          orderBy: [{ category: "asc" }, { title: "asc" }],
        })
      : [];

  const attendanceTabContent = (
    <section className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border p-5">
        <h2 className="text-xl font-semibold">Rueckmeldungen</h2>
        <p className="mt-1 text-sm text-muted">Trainer und Co-Trainer koennen Rueckmeldungen fuer Spieler setzen.</p>
        {query.error === "declined-reason" ? (
          <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
            Bei einer Absage muss ein Grund angegeben werden.
          </p>
        ) : null}
        {query.error === "training-rating" ? (
          <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
            Trainingsbewertungen muessen zwischen 1.0 und 10.0 liegen.
          </p>
        ) : null}
      </div>
      {players.length > 0 ? (
        <AttendancePanel
          eventId={event.id}
          players={players.map((player) => {
            const attendance = attendanceByPlayer.get(player.id);
            return {
              id: player.id,
              firstName: player.firstName,
              lastName: player.lastName,
              position: player.position,
              status: attendance?.status ?? null,
              reason: attendance?.reason ?? null,
            };
          })}
        />
      ) : (
        <div className="p-5">
          <EmptyState
            title="Keine Spieler im Kader"
            description="Lege zuerst Spieler an, damit Rueckmeldungen fuer diesen Termin gepflegt werden koennen."
          />
        </div>
      )}
    </section>
  );

  const trainingPlanTabContent = (
    <section className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border p-5">
        <h2 className="text-xl font-semibold">Trainingsplan</h2>
        <p className="mt-1 text-sm text-muted">
          Plane die Einheit aus Uebungen im Katalog. Reihenfolge, Dauer und Coaching Points koennen je Termin abweichen.
        </p>
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {event.trainingPlan?.exercises.length ? (
            event.trainingPlan.exercises.map((planExercise, index) => (
              <article className="rounded-lg border border-border p-4" key={planExercise.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-primary">Teil {index + 1}</p>
                    <h3 className="mt-1 text-lg font-bold text-foreground">{planExercise.trainingExercise.title}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {trainingCategoryLabel(planExercise.trainingExercise.category)} /{" "}
                      {trainingIntensityLabel(planExercise.trainingExercise.intensity)}
                    </p>
                  </div>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground">
                    {planExercise.durationMinutes ?? planExercise.trainingExercise.durationMinutes ?? "-"} Min.
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {planExercise.coachingPoints ||
                    planExercise.trainingExercise.coachingPoints ||
                    planExercise.trainingExercise.objective ||
                    "Noch keine Coaching Points hinterlegt."}
                </p>
              </article>
            ))
          ) : (
            <EmptyState
              title="Noch keine Uebungen im Plan"
              description="Fuege Uebungen aus der Trainingsbibliothek hinzu, um diese Einheit zu strukturieren."
            />
          )}
        </div>

        <aside className="space-y-5">
          <form action={upsertTrainingPlan} className="rounded-lg border border-border bg-surface-muted p-4">
            <input name="calendarEventId" type="hidden" value={event.id} />
            <p className="text-sm font-semibold text-foreground">Ziel der Einheit</p>
            <input
              className="mt-3 h-10 w-full rounded-lg border border-border px-3 text-sm"
              defaultValue={event.trainingPlan?.objective ?? ""}
              name="objective"
              placeholder="z.B. Umschalten nach Ballgewinn"
            />
            <textarea
              className="mt-3 min-h-20 w-full rounded-lg border border-border px-3 py-2 text-sm"
              defaultValue={event.trainingPlan?.notes ?? ""}
              name="notes"
              placeholder="Notizen zur Einheit"
            />
            <button className="mt-3 h-10 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-white" type="submit">
              Plan speichern
            </button>
          </form>

          <form action={addExerciseToTrainingPlan} className="rounded-lg border border-border bg-surface p-4">
            <input name="calendarEventId" type="hidden" value={event.id} />
            <p className="text-sm font-semibold text-foreground">Uebung hinzufuegen</p>
            <select className="mt-3 h-10 w-full rounded-lg border border-border px-3 text-sm" name="trainingExerciseId" required>
              <option value="">Uebung auswaehlen</option>
              {catalogExercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.title}
                </option>
              ))}
            </select>
            <input
              className="mt-3 h-10 w-full rounded-lg border border-border px-3 text-sm"
              min={1}
              name="durationMinutes"
              placeholder="Dauer in Minuten"
              type="number"
            />
            <textarea
              className="mt-3 min-h-20 w-full rounded-lg border border-border px-3 py-2 text-sm"
              name="coachingPoints"
              placeholder="Spezifische Coaching Points fuer diese Einheit"
            />
            <button className="mt-3 h-10 w-full rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
              Hinzufuegen
            </button>
            {catalogExercises.length === 0 ? (
              <Link className="mt-3 inline-flex text-sm font-semibold text-primary" href="/training/new">
                Erst eine Kataloguebung anlegen
              </Link>
            ) : null}
          </form>
        </aside>
      </div>
    </section>
  );

  const trainingPerformanceTabContent = (
    <section className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border p-5">
        <h2 className="text-xl font-semibold">Trainingsleistung</h2>
        <p className="mt-1 text-sm text-muted">
          Bewertung pro Spieler fuer diese Einheit. Nur Spieler mit Zusage werden hier angezeigt. Diese Werte werden
          getrennt von Spielbewertungen gespeichert.
        </p>
      </div>
      {presentPlayers.length > 0 ? (
        <TrainingPerformanceTable
          eventId={event.id}
          players={presentPlayers.map((player) => {
            const performance = trainingPerformanceByPlayer.get(player.id);
            return {
              id: player.id,
              firstName: player.firstName,
              lastName: player.lastName,
              position: player.position,
              rating: performance?.rating ?? null,
              note: performance?.note ?? null,
            };
          })}
        />
      ) : (
        <div className="p-5">
          <EmptyState
            title={players.length > 0 ? "Noch keine Zusagen" : "Keine Spieler im Kader"}
            description={
              players.length > 0
                ? "Sobald Spieler im Tab Rueckmeldungen zugesagt haben, koennen hier Trainingsleistungen bewertet werden."
                : "Lege zuerst Spieler an, damit Trainingsleistungen bewertet werden koennen."
            }
          />
        </div>
      )}
    </section>
  );

  const matchTabContent = event.match ? (
    <article className="max-w-md rounded-lg border border-border bg-surface p-5">
      <p className="text-xs font-semibold uppercase text-muted">Spiel</p>
      <h2 className="mt-2 text-xl font-semibold">{event.match.opponent}</h2>
      <p className="mt-2 text-sm text-muted">{event.match.isHomeGame ? "Heimspiel" : "Auswaertsspiel"}</p>
      <Link
        className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white"
        href={`/spiele/${event.match.id}`}
      >
        Spiel vorbereiten
      </Link>
    </article>
  ) : null;

  const tabs = [{ id: "rueckmeldungen", label: "Rueckmeldungen", content: attendanceTabContent }];

  if (event.type === "TRAINING") {
    tabs.push({ id: "trainingsplan", label: "Trainingsplan", content: trainingPlanTabContent });
    tabs.push({ id: "trainingsleistung", label: "Trainingsleistung", content: trainingPerformanceTabContent });
  }

  if (matchTabContent) {
    tabs.push({ id: "spiel", label: "Spiel", content: matchTabContent });
  }

  return (
    <AppShell context={context} activePath="/kalender">
      <Breadcrumbs items={[{ label: "Kalender", href: "/kalender" }, { label: event.title }]} />
      <PageHeader
        eyebrow={eventTypeLabel(event.type)}
        title={event.title}
        description={`${formatDateTime(event.startsAt)} bis ${formatDateTime(event.endsAt)}${event.location ? `, ${event.location}` : ""}`}
        action={
          <>
            {hasPermission(context, "calendar.events.manage", activeTeam.id) ? (
              <Link
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground"
                href={`/kalender/${event.id}/edit`}
              >
                <Edit className="size-4" aria-hidden="true" />
                Bearbeiten
              </Link>
            ) : null}
            {event.type === "TRAINING" ? (
              <Link
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground"
                href={`/kalender/${event.id}/druck`}
              >
                <Printer className="size-4" aria-hidden="true" />
                Druckansicht
              </Link>
            ) : null}
          </>
        }
      />

      <div className="py-6">{tabs.length > 1 ? <PlayerTabs tabs={tabs} /> : tabs[0].content}</div>
    </AppShell>
  );
}
