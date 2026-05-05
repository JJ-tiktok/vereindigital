import { Activity, Download, FileText, Plus, Search, UserRound } from "lucide-react";
import Link from "next/link";

import { AppShell, EmptyState } from "@/components/app-shell";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { getInitials } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function SquadPage() {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const now = new Date();
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
      fileEntries: {
        where: {
          teamId: activeTeam.id,
        },
        select: {
          id: true,
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
          minutesPlayed: true,
          rating: true,
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
  });
  const squadRows = players.map((player) => {
    const matchRatings = player.matchStats
      .map((stat) => stat.rating)
      .filter((rating): rating is number => rating !== null);
    const trainingRatings = player.trainingPerformances.map((performance) => performance.rating);

    return {
      id: player.id,
      name: `${player.firstName} ${player.lastName}`,
      initials: getInitials(player.firstName, player.lastName),
      position: player.position,
      age: getAge(player.birthDate),
      goals: sum(player.matchStats.map((stat) => stat.goals)),
      assists: sum(player.matchStats.map((stat) => stat.assists)),
      minutes: sum(player.matchStats.map((stat) => stat.minutesPlayed)),
      matchForm: average(matchRatings),
      trainingForm: average(trainingRatings),
      fileEntries: player.fileEntries.length,
      status: getPlayerStatus(player.availabilities[0]?.type),
    };
  });
  const fitCount = squadRows.filter((player) => player.status.kind === "fit").length;
  const injuredCount = squadRows.filter((player) => player.status.kind === "injured").length;
  const unavailableCount = squadRows.filter((player) => player.status.kind === "absent").length;
  const readinessRate = squadRows.length > 0 ? Math.round((fitCount / squadRows.length) * 100) : 0;
  const averageTrainingForm = average(
    squadRows.map((player) => player.trainingForm).filter((rating): rating is number => rating !== null),
  );
  const averageMatchForm = average(
    squadRows.map((player) => player.matchForm).filter((rating): rating is number => rating !== null),
  );
  const formBars = buildFormBars(averageTrainingForm, averageMatchForm);

  return (
    <AppShell context={context} activePath="/kader">
      <section className="space-y-6 py-2">
        <div className="flex flex-col gap-4 border-b border-border pb-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Kaderverwaltung</p>
            <h1 className="mt-2 text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">{activeTeam.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Uebersicht, Status und Leistungsdaten deines aktuellen Kaders.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                className="h-11 w-full rounded-lg border border-border bg-white pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100 sm:w-72"
                placeholder="Spieler suchen..."
                type="search"
              />
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-slate-900" type="button">
              <Download className="size-4" aria-hidden="true" />
              Exportieren
            </button>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-strong"
              href="/kader/new"
            >
              <Plus className="size-4" aria-hidden="true" />
              Neuer Spieler
            </Link>
          </div>
        </div>

        {squadRows.length > 0 ? (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr]">
              <article className="rounded-lg border border-border bg-white p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-800">
                  <UserRound className="size-4 text-primary" aria-hidden="true" />
                  Gesamtkader
                </div>
                <div className="mt-5 flex items-end gap-4">
                  <p className="text-5xl font-bold tabular-nums text-slate-950">{squadRows.length}</p>
                  <p className="pb-2 text-lg font-semibold text-slate-700">Spieler</p>
                </div>
                <div className="mt-8 border-t border-border pt-5">
                  <div className="flex flex-wrap gap-4 text-sm text-slate-800">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary" />
                      {fitCount} einsatzbereit
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-rose-500" />
                      {injuredCount} verletzt
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full bg-slate-400" />
                      {unavailableCount} abwesend
                    </span>
                  </div>
                </div>
              </article>

              <StatusCard
                color="blue"
                helper={`${fitCount} von ${squadRows.length}`}
                label="Einsatzbereit"
                percentage={readinessRate}
                value={fitCount.toString()}
              />
              <StatusCard
                color="red"
                helper="aktuelle Abwesenheiten"
                label="Verletzt / Reha"
                percentage={squadRows.length > 0 ? Math.round((injuredCount / squadRows.length) * 100) : 0}
                value={injuredCount.toString()}
              />
              <article className="rounded-lg border border-border bg-white p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-800">
                  <Activity className="size-4 text-primary" aria-hidden="true" />
                  Formkurve Team
                </div>
                <div className="mt-7 flex h-28 items-end gap-3">
                  {formBars.map((height, index) => (
                    <div
                      className={`w-full rounded-t ${index >= 4 ? "bg-primary" : "bg-blue-100"}`}
                      key={index}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex justify-between text-sm text-muted">
                  <span>Vor 5 Wo.</span>
                  <span>Aktuell</span>
                </div>
              </article>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <button className="h-10 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-slate-800" type="button">
                  Alle Positionen
                </button>
                <button className="h-10 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-slate-800" type="button">
                  Alle Status
                </button>
              </div>
              <button className="h-10 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-slate-800" type="button">
                Vergleichen
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-white">
              <div className="border-b border-border bg-slate-50 px-5 py-3">
                <div className="grid grid-cols-[48px_minmax(240px,1.3fr)_90px_120px_160px_110px_90px] gap-4 text-xs font-semibold uppercase tracking-wide text-muted max-xl:hidden">
                  <span>#</span>
                  <span>Spieler</span>
                  <span>Position</span>
                  <span>Status</span>
                  <span>Trainingsform</span>
                  <span>Belastung</span>
                  <span>Aktion</span>
                </div>
                <div className="xl:hidden">
                  <p className="text-xs font-semibold uppercase text-muted">Kader</p>
                </div>
              </div>
              <div className="divide-y divide-border">
                {squadRows.map((player, index) => (
                  <Link
                    className={`block px-5 py-4 transition hover:bg-blue-50/60 ${
                      player.status.kind === "injured" ? "bg-rose-50/40" : ""
                    }`}
                    href={`/kader/${player.id}`}
                    key={player.id}
                  >
                    <div className="grid gap-4 xl:grid-cols-[48px_minmax(240px,1.3fr)_90px_120px_160px_110px_90px] xl:items-center">
                      <span className="hidden text-sm font-bold tabular-nums text-slate-700 xl:block">{index + 1}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-blue-50 text-sm font-bold text-primary">
                          {player.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950">{player.name}</p>
                          <p className="mt-1 text-sm text-muted xl:hidden">
                            {player.position} / {player.age} Jahre / {player.status.label}
                          </p>
                          <p className="hidden text-sm text-muted xl:block">
                            {player.goals} Tore / {player.assists} Vorlagen / {player.minutes} Min.
                          </p>
                        </div>
                      </div>
                      <span className="hidden w-max rounded-lg bg-slate-100 px-3 py-1 text-center text-xs font-semibold text-slate-700 xl:block">
                        {player.position}
                      </span>
                      <StatusBadge status={player.status} />
                      <TrainingFormBar value={player.trainingForm} />
                      <LoadIndicator value={player.trainingForm} />
                      <span className="hidden items-center gap-2 text-sm font-semibold text-primary xl:flex">
                        <FileText className="size-4" aria-hidden="true" />
                        Profil
                      </span>
                      <div className="grid grid-cols-2 gap-3 xl:hidden">
                        <MobileStat label="Spiel" value={formatRating(player.matchForm)} />
                        <MobileStat label="Training" value={formatRating(player.trainingForm)} />
                        <MobileStat label="T / V" value={`${player.goals} / ${player.assists}`} />
                        <MobileStat label="Akte" value={player.fileEntries.toString()} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="flex flex-col gap-3 border-t border-border px-5 py-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Zeige 1 bis {squadRows.length} von {squadRows.length} Eintraegen
                </span>
                <span className="font-semibold text-primary">Seite 1</span>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title="Noch keine Spieler im Kader"
            description="Lege den ersten Spieler an, damit Kalender-Rueckmeldungen und Abwesenheiten sinnvoll getestet werden koennen."
            action={
              <Link className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" href="/kader/new">
                <UserRound className="size-4" aria-hidden="true" />
                Spieler anlegen
              </Link>
            }
          />
        )}
      </section>
    </AppShell>
  );
}

function StatusCard({
  color,
  helper,
  label,
  percentage,
  value,
}: {
  color: "blue" | "red";
  helper: string;
  label: string;
  percentage: number;
  value: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-800">
        <span className={`size-2 rounded-full ${color === "blue" ? "bg-primary" : "bg-rose-600"}`} />
        {label}
      </div>
      <div className="mt-5 flex items-end gap-3">
        <p className={`text-5xl font-bold tabular-nums ${color === "blue" ? "text-slate-950" : "text-rose-700"}`}>
          {value}
        </p>
        <p className="pb-2 text-sm font-semibold text-slate-700">{helper}</p>
      </div>
      <div className="mt-5 h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color === "blue" ? "bg-primary" : "bg-rose-500"}`} style={{ width: `${percentage}%` }} />
      </div>
    </article>
  );
}

function MobileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 font-bold tabular-nums text-slate-950">{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: {
    kind: "fit" | "injured" | "absent";
    label: string;
  };
}) {
  const classes = {
    absent: "bg-slate-100 text-slate-700",
    fit: "bg-blue-50 text-primary",
    injured: "bg-rose-50 text-rose-700",
  };

  return (
    <span className={`hidden w-max rounded-full px-3 py-1 text-xs font-semibold xl:inline-flex ${classes[status.kind]}`}>
      <span className="mr-2 mt-1 size-2 rounded-full bg-current" />
      {status.label}
    </span>
  );
}

function TrainingFormBar({ value }: { value: number | null }) {
  const percentage = value === null ? 0 : Math.round(value * 10);

  return (
    <div className="hidden items-center gap-3 xl:flex">
      <span className="w-10 text-sm font-semibold tabular-nums text-slate-800">{value === null ? "-" : `${percentage}%`}</span>
      <div className="h-2 flex-1 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function LoadIndicator({ value }: { value: number | null }) {
  const percentage = value === null ? 0 : Math.round(value * 10);
  const label = percentage >= 85 ? "Hoch" : percentage >= 65 ? "Mittel" : percentage > 0 ? "Niedrig" : "-";
  const activeBars = percentage >= 85 ? 4 : percentage >= 65 ? 3 : percentage > 0 ? 2 : 0;

  return (
    <div className="hidden xl:block">
      <div className="flex h-5 items-end gap-1">
        {[1, 2, 3, 4].map((bar) => (
          <span
            className={`w-2 rounded-t ${bar <= activeBars ? "bg-primary" : "bg-slate-200"}`}
            key={bar}
            style={{ height: `${bar * 20}%` }}
          />
        ))}
      </div>
      <p className="mt-1 text-sm text-slate-700">{label}</p>
    </div>
  );
}

function getAge(birthDate: Date) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

  if (today < birthdayThisYear) {
    age -= 1;
  }

  return age;
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

function formatRating(value: number | null) {
  if (value === null) {
    return "-";
  }

  return value.toFixed(1);
}

function getPlayerStatus(type?: string) {
  if (type === "INJURY" || type === "ILLNESS") {
    return {
      kind: "injured" as const,
      label: type === "INJURY" ? "Verletzt" : "Krank",
    };
  }

  if (type) {
    return {
      kind: "absent" as const,
      label: "Abwesend",
    };
  }

  return {
    kind: "fit" as const,
    label: "Fit",
  };
}

function buildFormBars(trainingForm: number | null, matchForm: number | null) {
  const current = average([trainingForm, matchForm].filter((value): value is number => value !== null));
  const base = current === null ? 55 : Math.round(current * 10);

  return [
    Math.max(25, base - 28),
    Math.max(30, base - 20),
    Math.max(28, base - 24),
    Math.max(40, base - 12),
    Math.max(45, base - 4),
    Math.max(50, base),
  ];
}
