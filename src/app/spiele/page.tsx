import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { AppShell, EmptyState, PageHeader } from "@/components/app-shell";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { formatDateTime } from "@/lib/format";
import { matchCompetitionLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function MatchesPage() {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const matches = await prisma.match.findMany({
    where: {
      teamId: activeTeam.id,
    },
    include: {
      calendarEvent: true,
      playerStats: true,
    },
    orderBy: {
      calendarEvent: {
        startsAt: "asc",
      },
    },
  });
  const finishedCount = matches.filter((match) => match.status === "FINISHED").length;
  const upcomingCount = matches.filter((match) => match.status === "PLANNED" || match.status === "LIVE").length;

  return (
    <AppShell context={context} activePath="/spiele">
      <PageHeader
        eyebrow="Spieltage"
        title={`Spiele ${activeTeam.name}`}
        description="Spieltermine, Ergebnisse und Spielerstatistiken."
      />

      {matches.length > 0 ? (
        <section className="grid gap-4 py-6 md:grid-cols-3">
          <MetricCard label="Spiele gesamt" value={matches.length.toString()} />
          <MetricCard label="Bevorstehend" value={upcomingCount.toString()} />
          <MetricCard label="Beendet" value={finishedCount.toString()} />
        </section>
      ) : null}

      <section className={matches.length > 0 ? "pb-6" : "py-6"}>
        {matches.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="divide-y divide-border">
              {matches.map((match) => {
                const result = matchResult(match.status, match.goalsFor, match.goalsAgainst);

                return (
                  <Link
                    className="flex items-center gap-4 p-4 transition hover:bg-surface-muted sm:p-5"
                    href={`/spiele/${match.id}`}
                    key={match.id}
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                      {getInitialsFromName(match.opponent)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-bold text-foreground">{match.opponent}</p>
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold uppercase text-muted">
                          {match.isHomeGame ? "Heim" : "Auswaerts"}
                        </span>
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold uppercase text-primary">
                          {matchCompetitionLabel(match.competition)}
                        </span>
                        <StatusPill status={match.status} />
                      </div>
                      <p className="mt-1 truncate text-sm text-muted">
                        {match.calendarEvent ? formatDateTime(match.calendarEvent.startsAt) : "Ohne Kalendertermin"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p
                          className={`text-lg font-black tabular-nums ${
                            result === "win"
                              ? "text-success"
                              : result === "loss"
                                ? "text-danger"
                                : "text-foreground"
                          }`}
                        >
                          {match.goalsFor ?? "-"}:{match.goalsAgainst ?? "-"}
                        </p>
                        {match.playerStats.length > 0 ? (
                          <p className="text-xs text-muted">{match.playerStats.length} Werte erfasst</p>
                        ) : null}
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState
            title="Noch keine Spiele"
            description="Erstelle im Kalender einen Termin vom Typ Spiel, dann erscheint er hier."
          />
        )}
      </section>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-3 text-4xl font-bold tabular-nums text-foreground">{value}</p>
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  const classes: Record<string, string> = {
    CANCELLED: "bg-surface-muted text-muted",
    FINISHED: "bg-success-soft text-success",
    LIVE: "bg-danger-soft text-danger",
    PLANNED: "bg-primary-soft text-primary",
  };
  const labels: Record<string, string> = {
    CANCELLED: "Abgesagt",
    FINISHED: "Beendet",
    LIVE: "Live",
    PLANNED: "Geplant",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${classes[status] ?? "bg-surface-muted text-muted"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function matchResult(status: string, goalsFor: number | null, goalsAgainst: number | null) {
  if (status !== "FINISHED" || goalsFor === null || goalsAgainst === null) {
    return "none";
  }

  if (goalsFor > goalsAgainst) {
    return "win";
  }

  if (goalsFor < goalsAgainst) {
    return "loss";
  }

  return "draw";
}

function getInitialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
