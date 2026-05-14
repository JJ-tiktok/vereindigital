import { Activity, Download, Plus, UserRound } from "lucide-react";
import Link from "next/link";

import { SquadRoster, type SquadRow } from "@/app/kader/squad-roster";
import { AppShell, EmptyState } from "@/components/app-shell";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { getInitials } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function SquadPage({
  searchParams,
}: {
  searchParams: Promise<{ removed?: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const query = await searchParams;
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
  const squadRows: SquadRow[] = players.map((player) => {
    const matchRatings = player.matchStats
      .map((stat) => stat.rating)
      .filter((rating): rating is number => rating !== null);
    const trainingRatings = player.trainingPerformances.map((performance) => performance.rating);

    return {
      id: player.id,
      name: `${player.firstName} ${player.lastName}`,
      initials: getInitials(player.firstName, player.lastName),
      jerseyNumber: player.jerseyNumber,
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
  }).sort((a, b) => {
    const positionDiff = positionRank(a.position) - positionRank(b.position);
    if (positionDiff !== 0) {
      return positionDiff;
    }

    const jerseyDiff = (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999);
    if (jerseyDiff !== 0) {
      return jerseyDiff;
    }

    return a.name.localeCompare(b.name);
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
        {query.removed ? (
          <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Spieler wurde aus dem aktuellen Kader entfernt.
          </p>
        ) : null}

        <div className="flex flex-col gap-4 border-b border-border pb-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Kaderverwaltung</p>
            <h1 className="mt-2 text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">{activeTeam.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Uebersicht, Status und Leistungsdaten deines aktuellen Kaders.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
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

            <SquadRoster players={squadRows} />
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

function positionRank(position: string) {
  const normalized = position.toUpperCase();

  if (normalized === "TW" || normalized === "GK") {
    return 0;
  }

  if (["IV", "AV", "LV", "RV", "CB", "LB", "RB"].includes(normalized)) {
    return 1;
  }

  if (["DM", "ZM", "OM", "CM", "CDM", "CAM", "LM", "RM"].includes(normalized)) {
    return 2;
  }

  if (["FL", "ST", "LA", "RA", "LW", "RW", "CF", "MS"].includes(normalized)) {
    return 3;
  }

  return 4;
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
