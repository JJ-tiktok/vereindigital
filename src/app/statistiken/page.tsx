import { AttendanceStatus, CalendarEventType, LineupStatus } from "@prisma/client";

import { AppShell, EmptyState, PageHeader } from "@/components/app-shell";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

export default async function StatisticsPage() {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);

  const [players, trainingEvents, matches] = await Promise.all([
    prisma.playerProfile.findMany({
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
      include: {
        attendances: {
          where: {
            calendarEvent: {
              teamId: activeTeam.id,
              type: CalendarEventType.TRAINING,
            },
          },
          select: {
            status: true,
          },
        },
        matchStats: {
          where: {
            match: {
              teamId: activeTeam.id,
            },
          },
          select: {
            assists: true,
            goals: true,
            lineupStatus: true,
            minutesPlayed: true,
            rating: true,
            redCards: true,
            yellowCards: true,
          },
        },
        trainingPerformances: {
          where: {
            calendarEvent: {
              teamId: activeTeam.id,
            },
          },
          select: {
            rating: true,
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.calendarEvent.findMany({
      where: {
        teamId: activeTeam.id,
        type: CalendarEventType.TRAINING,
      },
      select: {
        id: true,
      },
    }),
    prisma.match.findMany({
      where: {
        teamId: activeTeam.id,
      },
      select: {
        id: true,
        status: true,
      },
    }),
  ]);

  const trainingCount = trainingEvents.length;
  const matchCount = matches.length;
  const finishedMatchCount = matches.filter((match) => match.status === "FINISHED").length;

  const rows = players.map((player) => {
    const acceptedTrainings = player.attendances.filter(
      (attendance) => attendance.status === AttendanceStatus.ACCEPTED,
    ).length;
    const maybeTrainings = player.attendances.filter(
      (attendance) => attendance.status === AttendanceStatus.MAYBE,
    ).length;
    const declinedTrainings = player.attendances.filter(
      (attendance) => attendance.status === AttendanceStatus.DECLINED,
    ).length;
    const trainingRate = percent(acceptedTrainings, trainingCount);

    const playedStats = player.matchStats.filter(
      (stat) => stat.minutesPlayed > 0 || stat.lineupStatus !== LineupStatus.NOT_USED,
    );
    const starts = player.matchStats.filter((stat) => stat.lineupStatus === LineupStatus.STARTER).length;
    const substitutions = player.matchStats.filter(
      (stat) => stat.lineupStatus === LineupStatus.SUBSTITUTE,
    ).length;
    const ratingValues = player.matchStats
      .map((stat) => stat.rating)
      .filter((rating): rating is number => rating !== null);
    const trainingRatingValues = player.trainingPerformances.map((performance) => performance.rating);

    const goals = sum(player.matchStats.map((stat) => stat.goals));
    const assists = sum(player.matchStats.map((stat) => stat.assists));
    const minutesPlayed = sum(player.matchStats.map((stat) => stat.minutesPlayed));
    const yellowCards = sum(player.matchStats.map((stat) => stat.yellowCards));
    const redCards = sum(player.matchStats.map((stat) => stat.redCards));
    const averageRating = ratingValues.length > 0 ? sum(ratingValues) / ratingValues.length : null;
    const averageTrainingRating =
      trainingRatingValues.length > 0 ? sum(trainingRatingValues) / trainingRatingValues.length : null;

    return {
      id: player.id,
      name: `${player.firstName} ${player.lastName}`,
      position: player.position,
      acceptedTrainings,
      maybeTrainings,
      declinedTrainings,
      trainingRate,
      playedMatches: playedStats.length,
      starts,
      substitutions,
      goals,
      assists,
      minutesPlayed,
      yellowCards,
      redCards,
      averageRating,
      averageTrainingRating,
      ratedMatches: ratingValues.length,
      ratedTrainings: trainingRatingValues.length,
    };
  });

  const totalAcceptedTrainings = sum(rows.map((row) => row.acceptedTrainings));
  const totalPossibleTrainings = players.length * trainingCount;
  const teamTrainingRate = percent(totalAcceptedTrainings, totalPossibleTrainings);
  const totalGoals = sum(rows.map((row) => row.goals));
  const totalAssists = sum(rows.map((row) => row.assists));
  const ratedStatsCount = sum(rows.map((row) => row.ratedMatches));
  const ratedTrainingsCount = sum(rows.map((row) => row.ratedTrainings));

  const trainingLeaders = [...rows]
    .sort((first, second) => second.trainingRate - first.trainingRate || second.acceptedTrainings - first.acceptedTrainings)
    .slice(0, 5);
  const performanceLeaders = [...rows]
    .sort((first, second) => second.goals - first.goals || second.assists - first.assists || second.minutesPlayed - first.minutesPlayed)
    .slice(0, 5);

  return (
    <AppShell context={context} activePath="/statistiken">
      <PageHeader
        eyebrow="Statistiken"
        title={`Auswertungen ${activeTeam.name}`}
        description="Trainingsbeteiligung, Trainingsleistung, Spielerentwicklung und Spielleistung auf Basis der echten Teamdaten."
      />

      <section className="grid gap-4 py-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Kader" value={players.length.toString()} helper="aktive Spieler" />
        <MetricCard label="Trainingsquote" value={`${teamTrainingRate}%`} helper={`${trainingCount} Trainings erfasst`} />
        <MetricCard label="Spiele" value={`${finishedMatchCount}/${matchCount}`} helper="beendet / geplant" />
        <MetricCard label="Scorer" value={`${totalGoals + totalAssists}`} helper={`${totalGoals} Tore, ${totalAssists} Vorlagen`} />
      </section>

      {players.length === 0 ? (
        <EmptyState
          title="Noch keine Statistikdaten"
          description="Lege zuerst Spieler im Kader an. Danach entstehen hier automatisch Auswertungen aus Trainings, Rueckmeldungen und Spieltagen."
        />
      ) : (
        <div className="space-y-6 pb-8">
          <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-lg border border-border bg-white">
              <PanelHeader
                title="Trainingsbeteiligung"
                description="Annahmen werden nur aus Trainingsterminen berechnet."
              />
              {trainingCount > 0 ? (
                <div className="divide-y divide-border">
                  {trainingLeaders.map((row) => (
                    <PlayerProgressRow
                      key={row.id}
                      label={row.name}
                      meta={`${row.acceptedTrainings} Zusagen, ${row.declinedTrainings} Absagen`}
                      value={row.trainingRate}
                    />
                  ))}
                </div>
              ) : (
                <PanelEmpty text="Noch keine Trainingstermine vorhanden." />
              )}
            </article>

            <article className="rounded-lg border border-border bg-white">
              <PanelHeader
                title="Spielerleistungen"
                description="Sortiert nach Toren, Vorlagen und Einsatzzeit."
              />
              {matchCount > 0 ? (
                <div className="divide-y divide-border">
                  {performanceLeaders.map((row) => (
                    <div className="grid gap-3 p-5 sm:grid-cols-[1fr_repeat(4,72px)]" key={row.id}>
                      <div>
                        <p className="font-semibold text-slate-950">{row.name}</p>
                        <p className="mt-1 text-sm text-muted">{row.position}</p>
                      </div>
                      <SmallStat label="Tore" value={row.goals} />
                      <SmallStat label="Vorlagen" value={row.assists} />
                      <SmallStat label="Min." value={row.minutesPlayed} />
                      <SmallStat label="Spiel" value={formatRating(row.averageRating)} />
                    </div>
                  ))}
                </div>
              ) : (
                <PanelEmpty text="Noch keine Spiele vorhanden." />
              )}
            </article>
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-white">
            <div className="border-b border-border p-5">
              <h2 className="text-xl font-semibold text-slate-950">Spieler-Auswertung</h2>
              <p className="mt-1 text-sm text-muted">
                Kombinierte Sicht auf Training, Spielminuten, Scorerpunkte, Karten sowie getrennte Trainings- und Spielbewertung.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1080px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-muted">
                  <tr>
                    <th className="px-5 py-3">Spieler</th>
                    <th className="px-5 py-3">Training</th>
                    <th className="px-5 py-3">Trainingsbewertung</th>
                    <th className="px-5 py-3">Spiele</th>
                    <th className="px-5 py-3">Startelf</th>
                    <th className="px-5 py-3">Minuten</th>
                    <th className="px-5 py-3">Tore</th>
                    <th className="px-5 py-3">Vorlagen</th>
                    <th className="px-5 py-3">Karten</th>
                    <th className="px-5 py-3">Spielbewertung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr className="align-top" key={row.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-950">{row.name}</p>
                        <p className="mt-1 text-xs text-muted">{row.position}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-950">{row.trainingRate}%</p>
                        <p className="mt-1 text-xs text-muted">
                          {row.acceptedTrainings} ja, {row.maybeTrainings} vielleicht, {row.declinedTrainings} nein
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatRating(row.averageTrainingRating)}
                        <p className="mt-1 text-xs text-muted">{row.ratedTrainings} Bewertungen</p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {row.playedMatches} Einsaetze
                        <p className="mt-1 text-xs text-muted">{row.substitutions} Einwechslungen</p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{row.starts}</td>
                      <td className="px-5 py-4 text-slate-700">{row.minutesPlayed}</td>
                      <td className="px-5 py-4 text-slate-700">{row.goals}</td>
                      <td className="px-5 py-4 text-slate-700">{row.assists}</td>
                      <td className="px-5 py-4 text-slate-700">
                        {row.yellowCards} / {row.redCards}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatRating(row.averageRating)}
                        <p className="mt-1 text-xs text-muted">{row.ratedMatches} Bewertungen</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Spielbewertungen" value={ratedStatsCount.toString()} helper="gespeicherte Spielleistungen" />
            <MetricCard label="Trainingsbewertungen" value={ratedTrainingsCount.toString()} helper="gespeicherte Trainingsleistungen" />
            <MetricCard label="Tore" value={totalGoals.toString()} helper="ueber alle Spieler" />
          </section>
        </div>
      )}
    </AppShell>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-lg border border-border bg-white p-5">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-3 text-3xl font-bold tabular-nums text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-muted">{helper}</p>
    </article>
  );
}

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-border p-5">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}

function PlayerProgressRow({
  label,
  meta,
  value,
}: {
  label: string;
  meta: string;
  value: number;
}) {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-950">{label}</p>
          <p className="mt-1 text-sm text-muted">{meta}</p>
        </div>
        <p className="text-lg font-bold tabular-nums text-slate-950">{value}%</p>
      </div>
      <div className="mt-4 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 font-bold tabular-nums text-slate-950">{value}</p>
    </div>
  );
}

function PanelEmpty({ text }: { text: string }) {
  return <p className="p-5 text-sm text-muted">{text}</p>;
}

function percent(value: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function formatRating(value: number | null) {
  if (value === null) {
    return "-";
  }

  return value.toFixed(1);
}
