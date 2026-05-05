import {
  Activity,
  CalendarDays,
  Download,
  Search,
  Shield,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";

import { AppShell, EmptyState } from "@/components/app-shell";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { formatDate, formatDateTime, getInitials } from "@/lib/format";
import { eventTypeLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [players, upcomingEvents, todayEvents, nextTraining, matches] = await Promise.all([
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
        availabilities: {
          where: {
            startsAt: {
              lte: now,
            },
            endsAt: {
              gte: now,
            },
          },
          select: {
            type: true,
          },
          take: 1,
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
            rating: true,
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.calendarEvent.findMany({
      where: {
        teamId: activeTeam.id,
        startsAt: {
          gte: now,
        },
      },
      include: {
        attendances: true,
        match: true,
      },
      orderBy: {
        startsAt: "asc",
      },
      take: 6,
    }),
    prisma.calendarEvent.findMany({
      where: {
        teamId: activeTeam.id,
        startsAt: {
          gte: startOfToday,
          lt: endOfToday,
        },
      },
      include: {
        attendances: true,
      },
      orderBy: {
        startsAt: "asc",
      },
      take: 5,
    }),
    prisma.calendarEvent.findFirst({
      where: {
        teamId: activeTeam.id,
        type: "TRAINING",
        startsAt: {
          gte: now,
        },
      },
      include: {
        attendances: true,
      },
      orderBy: {
        startsAt: "asc",
      },
    }),
    prisma.match.findMany({
      where: {
        teamId: activeTeam.id,
      },
      include: {
        calendarEvent: true,
        playerStats: {
          include: {
            playerProfile: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
    }),
  ]);

  const unavailableCount = players.filter((player) => player.availabilities.length > 0).length;
  const fitCount = Math.max(players.length - unavailableCount, 0);
  const squadFitRate = percent(fitCount, players.length);
  const trainingAttendanceRate = nextTraining ? percent(nextTraining.attendances.length, players.length) : squadFitRate;
  const playerRatings = players.flatMap((player) =>
    player.matchStats.map((stat) => stat.rating).filter((rating): rating is number => rating !== null),
  );
  const teamFormValue = Math.round((average(playerRatings) ?? 0) * 10);
  const loadValue = Math.max(0, Math.min(100, Math.round((trainingAttendanceRate + squadFitRate) / 2)));
  const finishedMatches = matches.filter((match) => match.status === "FINISHED");
  const wins = finishedMatches.filter((match) => (match.goalsFor ?? 0) > (match.goalsAgainst ?? 0)).length;
  const draws = finishedMatches.filter((match) => (match.goalsFor ?? 0) === (match.goalsAgainst ?? 0)).length;
  const losses = finishedMatches.filter((match) => (match.goalsFor ?? 0) < (match.goalsAgainst ?? 0)).length;
  const points = wins * 3 + draws;
  const goalsFor = sum(finishedMatches.map((match) => match.goalsFor ?? 0));
  const goalsAgainst = sum(finishedMatches.map((match) => match.goalsAgainst ?? 0));
  const goalDifference = goalsFor - goalsAgainst;
  const topPerformers = buildTopPerformers(matches).slice(0, 3);
  const lastMatches = finishedMatches.slice(0, 3);

  return (
    <AppShell context={context} activePath="/dashboard">
      <section className="space-y-6 py-2">
        <div className="flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Performance Dashboard</p>
            <h1 className="mt-2 text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">Saisonueberblick</h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                className="h-11 w-full rounded-full border border-transparent bg-slate-100 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-blue-100 sm:w-80"
                placeholder="Suchen..."
                type="search"
              />
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-strong" type="button">
              <Download className="size-4" aria-hidden="true" />
              Bericht exportieren
            </button>
          </div>
        </div>

        <section className="rounded-lg border border-border bg-white p-5 sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1fr_330px] lg:items-center">
            <div>
              <h2 className="text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">
                Willkommen zurueck, Coach
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">
                {players.length > 0
                  ? `${activeTeam.name} hat ${fitCount} einsatzbereite Spieler. Die naechsten Termine und Leistungsdaten sind bereit fuer deine Analyse.`
                  : "Lege deinen ersten Kader an, damit das Dashboard mit echten Leistungsdaten arbeitet."}
              </p>
            </div>
            <article className="rounded-lg border border-border bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">Naechstes Training</p>
              <h3 className="mt-3 text-2xl font-bold text-slate-950">
                {nextTraining ? formatDashboardTime(nextTraining.startsAt) : "Noch nicht geplant"}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">
                {nextTraining ? `${nextTraining.title}${nextTraining.location ? `, ${nextTraining.location}` : ""}` : "Erstelle eine Trainingseinheit im Kalender."}
              </p>
              {nextTraining ? (
                <Link className="mt-4 inline-flex text-sm font-semibold text-primary" href={`/kalender/${nextTraining.id}`}>
                  Training oeffnen
                </Link>
              ) : null}
            </article>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <RingCard
            color="blue"
            detail={`${fitCount}/${players.length} Spieler bereit`}
            icon={<Users className="size-5" aria-hidden="true" />}
            label="Trainingsbeteiligung"
            sublabel="Squad Fit"
            value={trainingAttendanceRate}
          />
          <RingCard
            color="green"
            detail={finishedMatches.length > 0 ? `Letzte ${Math.min(finishedMatches.length, 5)} Spiele bewertet` : "Noch keine bewerteten Spiele"}
            icon={<TrendingUp className="size-5" aria-hidden="true" />}
            label="Teamform"
            sublabel="Index"
            value={teamFormValue}
          />
          <RingCard
            color="orange"
            detail={`${unavailableCount} aktuell abwesend`}
            icon={<Activity className="size-5" aria-hidden="true" />}
            label="Belastungsintensitaet"
            sublabel="Verfuegbarkeit"
            value={loadValue}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-2xl font-bold text-slate-950">Schnellzugriff</h2>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <QuickAction href="/training" icon={<CalendarDays className="size-5" />} label="Training planen" />
                <QuickAction href="/kader" icon={<Users className="size-5" />} label="Kader verwalten" />
                <QuickAction href="/spiele" icon={<Trophy className="size-5" />} label="Spieltag oeffnen" />
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
              <article className="rounded-lg border border-border bg-white p-5">
                <h2 className="text-2xl font-bold text-slate-950">Spielanalyse</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <ResultBar color="blue" label="Siege" total={finishedMatches.length} value={wins} />
                  <ResultBar color="slate" label="Unentschieden" total={finishedMatches.length} value={draws} />
                  <ResultBar color="red" label="Niederlagen" total={finishedMatches.length} value={losses} />
                </div>
                <div className="mt-8 border-t border-border pt-5">
                  <h3 className="text-xl font-bold text-slate-950">Saisonkennzahlen</h3>
                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <MiniMetric label="Punkte" value={points.toString()} />
                    <MiniMetric label="Tordifferenz" value={formatSigned(goalDifference)} />
                    <MiniMetric label="Tore" value={goalsFor.toString()} />
                  </div>
                  <TrendLine />
                </div>
              </article>

              <article className="rounded-lg border border-border bg-white p-5">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <h2 className="text-2xl font-bold text-slate-950">Top Performer</h2>
                  <Shield className="size-5 text-muted" aria-hidden="true" />
                </div>
                {topPerformers.length > 0 ? (
                  <div className="mt-5 space-y-5">
                    {topPerformers.map((performer) => (
                      <Link className="flex items-center gap-3" href={`/kader/${performer.id}`} key={performer.id}>
                        <div className="flex size-11 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-primary">
                          {performer.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-950">{performer.name}</p>
                          <p className="text-sm text-muted">Tore & Vorlagen</p>
                        </div>
                        <p className="text-2xl font-bold tabular-nums text-primary">{performer.score}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-muted">Noch keine Scorer-Daten vorhanden.</p>
                )}
              </article>
            </section>

            <section className="overflow-hidden rounded-lg border border-border bg-white">
              <div className="flex items-center justify-between border-b border-border p-5">
                <h2 className="text-2xl font-bold text-slate-950">Letzte Spiele</h2>
                <Link className="text-sm font-semibold text-primary" href="/spiele">
                  Alle anzeigen
                </Link>
              </div>
              {lastMatches.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[760px] w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-5 py-3">Datum</th>
                        <th className="px-5 py-3">Gegner</th>
                        <th className="px-5 py-3">Ergebnis</th>
                        <th className="px-5 py-3">Tendenz</th>
                        <th className="px-5 py-3">Spielerwerte</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {lastMatches.map((match) => (
                        <tr key={match.id}>
                          <td className="px-5 py-4 text-slate-700">
                            {match.calendarEvent ? formatDate(match.calendarEvent.startsAt) : "-"}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-950">{match.opponent}</td>
                          <td className="px-5 py-4 font-bold tabular-nums text-slate-950">
                            {match.goalsFor} - {match.goalsAgainst}
                          </td>
                          <td className="px-5 py-4">
                            <ResultPill goalsFor={match.goalsFor ?? 0} goalsAgainst={match.goalsAgainst ?? 0} />
                          </td>
                          <td className="px-5 py-4 text-slate-700">{match.playerStats.length} Eintraege</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5">
                  <EmptyState title="Noch keine Spiele abgeschlossen" description="Sobald Spielergebnisse erfasst sind, erscheinen sie hier." />
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <article className="rounded-lg border border-border bg-white">
              <div className="flex items-center justify-between border-b border-border p-5">
                <h2 className="text-2xl font-bold text-slate-950">Tagesablauf</h2>
                <p className="text-sm text-muted">Heute</p>
              </div>
              {todayEvents.length > 0 ? (
                <div className="divide-y divide-border">
                  {todayEvents.map((event) => (
                    <Link
                      className={`grid grid-cols-[64px_1fr] gap-4 p-5 transition hover:bg-blue-50/60 ${
                        event.id === nextTraining?.id ? "border-l-4 border-primary bg-blue-50" : ""
                      }`}
                      href={`/kalender/${event.id}`}
                      key={event.id}
                    >
                      <p className="text-sm font-bold tabular-nums text-slate-900">{formatTime(event.startsAt)}</p>
                      <div>
                        <p className="text-xl font-bold text-slate-950">{event.title}</p>
                        <p className="mt-1 text-sm text-muted">
                          {eventTypeLabel(event.type)}
                          {event.location ? ` / ${event.location}` : ""}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-primary">
                          {event.attendances.length}/{players.length} Rueckmeldungen
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="p-5 text-sm text-muted">Heute stehen keine Termine im Kalender.</p>
              )}
            </article>

            <article className="rounded-lg border border-border bg-slate-950 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-200">Naechste Termine</p>
              <div className="mt-4 space-y-4">
                {upcomingEvents.slice(0, 3).map((event) => (
                  <Link className="block rounded-lg bg-white/10 p-3 transition hover:bg-white/15" href={`/kalender/${event.id}`} key={event.id}>
                    <p className="text-sm font-semibold">{event.title}</p>
                    <p className="mt-1 text-xs text-slate-300">{formatDateTime(event.startsAt)}</p>
                  </Link>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </section>
    </AppShell>
  );
}

function RingCard({
  color,
  detail,
  icon,
  label,
  sublabel,
  value,
}: {
  color: "blue" | "green" | "orange";
  detail: string;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  value: number;
}) {
  const colorClass = {
    blue: "text-primary",
    green: "text-emerald-600",
    orange: "text-orange-600",
  }[color];
  const strokeClass = {
    blue: "#0f5bcf",
    green: "#059669",
    orange: "#ea580c",
  }[color];
  const dash = `${Math.max(0, Math.min(value, 100))} 100`;

  return (
    <article className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-xl font-bold text-slate-950">{label}</h2>
        <span className={colorClass}>{icon}</span>
      </div>
      <div className="mt-6 flex items-center justify-center">
        <div className="relative size-40">
          <svg className="-rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845a15.9155 15.9155 0 1 1 0 31.831a15.9155 15.9155 0 1 1 0 -31.831"
              fill="none"
              stroke="#e6e8f0"
              strokeWidth="3.5"
            />
            <path
              d="M18 2.0845a15.9155 15.9155 0 1 1 0 31.831a15.9155 15.9155 0 1 1 0 -31.831"
              fill="none"
              stroke={strokeClass}
              strokeDasharray={dash}
              strokeLinecap="round"
              strokeWidth="3.5"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-4xl font-bold tabular-nums text-slate-950">{value}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-800">{sublabel}</p>
          </div>
        </div>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-700">{detail}</p>
    </article>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link className="relative overflow-hidden rounded-lg border border-border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm" href={href}>
      <span className="text-primary">{icon}</span>
      <p className="mt-6 text-2xl font-bold leading-tight text-slate-950">{label}</p>
      <div className="absolute -bottom-6 -right-5 text-8xl font-bold text-slate-100">{label[0]}</div>
    </Link>
  );
}

function ResultBar({ color, label, total, value }: { color: "blue" | "red" | "slate"; label: string; total: number; value: number }) {
  const width = percent(value, total);
  const colorClass = {
    blue: "bg-primary",
    red: "bg-rose-600",
    slate: "bg-slate-500",
  }[color];

  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">
        {label} ({value})
      </p>
      <div className="mt-3 h-3 rounded-full bg-slate-100">
        <div className={`h-3 rounded-full ${colorClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{value}</p>
    </div>
  );
}

function TrendLine() {
  return (
    <div className="mt-8 h-40 rounded-lg bg-gradient-to-b from-blue-50 to-white p-4">
      <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 140">
        <path d="M0 118 C70 92, 118 104, 175 96 S280 70, 400 18" fill="none" stroke="#0f5bcf" strokeLinecap="round" strokeWidth="4" />
      </svg>
    </div>
  );
}

function ResultPill({ goalsAgainst, goalsFor }: { goalsAgainst: number; goalsFor: number }) {
  const result = goalsFor > goalsAgainst ? "Sieg" : goalsFor === goalsAgainst ? "Remis" : "Niederlage";
  const className =
    goalsFor > goalsAgainst
      ? "bg-emerald-50 text-emerald-700"
      : goalsFor === goalsAgainst
        ? "bg-slate-100 text-slate-700"
        : "bg-rose-50 text-rose-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>{result}</span>;
}

function buildTopPerformers(
  matches: {
    playerStats: {
      assists: number;
      goals: number;
      playerProfile: {
        firstName: string;
        id: string;
        lastName: string;
      };
    }[];
  }[],
) {
  const performers = new Map<string, { assists: number; goals: number; id: string; initials: string; name: string }>();

  matches.forEach((match) => {
    match.playerStats.forEach((stat) => {
      const existing =
        performers.get(stat.playerProfile.id) ??
        {
          assists: 0,
          goals: 0,
          id: stat.playerProfile.id,
          initials: getInitials(stat.playerProfile.firstName, stat.playerProfile.lastName),
          name: `${stat.playerProfile.firstName} ${stat.playerProfile.lastName}`,
        };
      existing.goals += stat.goals;
      existing.assists += stat.assists;
      performers.set(stat.playerProfile.id, existing);
    });
  });

  return [...performers.values()]
    .map((performer) => ({
      ...performer,
      score: performer.goals + performer.assists,
    }))
    .sort((first, second) => second.score - first.score);
}

function percent(value: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : value.toString();
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatDashboardTime(value: Date) {
  const today = new Date();
  const isToday =
    value.getFullYear() === today.getFullYear() &&
    value.getMonth() === today.getMonth() &&
    value.getDate() === today.getDate();

  return `${isToday ? "Heute" : formatDate(value)}, ${formatTime(value)}`;
}
