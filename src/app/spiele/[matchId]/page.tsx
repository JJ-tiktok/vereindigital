import { BarChart3, CalendarClock, ClipboardPen, LayoutGrid, Save } from "lucide-react";
import { notFound } from "next/navigation";

import { AppShell, Breadcrumbs } from "@/components/app-shell";
import { MatchLineupEditor } from "@/app/spiele/[matchId]/matchday-lineup-editor";
import { updateAllPlayerMatchStats, updateMatchResult, updateMatchTactic } from "@/lib/actions";
import { hasPermission, requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { formatDateTime, getInitials } from "@/lib/format";
import { matchCompetitionLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ error?: string; imported?: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const { matchId } = await params;
  const query = await searchParams;
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      teamId: activeTeam.id,
    },
    include: {
      calendarEvent: true,
      playerStats: {
        include: {
          playerProfile: true,
        },
      },
      tactic: {
        include: {
          slots: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!match) {
    notFound();
  }

  const [players, tactics] = await Promise.all([
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
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.tactic.findMany({
      where: { teamId: activeTeam.id },
      select: { id: true, name: true, formation: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const matchDate = match.calendarEvent?.startsAt ?? null;
  const unavailablePlayerIds = new Set(
    matchDate && players.length > 0
      ? (
          await prisma.playerAvailability.findMany({
            where: {
              playerProfileId: { in: players.map((player) => player.id) },
              startsAt: { lte: matchDate },
              OR: [{ endsAt: null }, { endsAt: { gte: matchDate } }],
            },
            select: { playerProfileId: true },
          })
        ).map((availability) => availability.playerProfileId)
      : [],
  );
  const statByPlayer = new Map(match.playerStats.map((stat) => [stat.playerProfileId, stat]));
  const playerRows = players
    .filter((player) => !unavailablePlayerIds.has(player.id) || statByPlayer.has(player.id))
    .map((player) => {
      const stat = statByPlayer.get(player.id);
      const played = Boolean(stat && (stat.minutesPlayed > 0 || stat.lineupStatus !== "NOT_USED"));

      return {
        assists: stat?.assists ?? 0,
        goals: stat?.goals ?? 0,
        id: player.id,
        initials: getInitials(player.firstName, player.lastName),
        jerseyNumber: player.jerseyNumber,
        lineupStatus: stat?.lineupStatus ?? "NOT_USED",
        minutesPlayed: stat?.minutesPlayed ?? 0,
        name: `${player.firstName} ${player.lastName}`,
        played,
        position: player.position ?? "?",
        rating: stat?.rating ?? null,
        redCards: stat?.redCards ?? 0,
        saved: Boolean(stat),
        unavailable: unavailablePlayerIds.has(player.id),
        yellowCards: stat?.yellowCards ?? 0,
      };
    })
    .sort((a, b) => {
      const positionDiff = positionRank(a.position) - positionRank(b.position);
      if (positionDiff !== 0) {
        return positionDiff;
      }

      const minuteDiff = b.minutesPlayed - a.minutesPlayed;
      if (minuteDiff !== 0) {
        return minuteDiff;
      }

      const playedDiff = Number(b.played) - Number(a.played);
      if (playedDiff !== 0) {
        return playedDiff;
      }

      const statusRank = lineupRank(a.lineupStatus) - lineupRank(b.lineupStatus);
      if (statusRank !== 0) {
        return statusRank;
      }

      return a.name.localeCompare(b.name);
    });
  const playedRows = playerRows.filter((player) => player.played);
  const starterCount = playerRows.filter((player) => player.lineupStatus === "STARTER").length;
  const substituteCount = playerRows.filter((player) => player.lineupStatus === "SUBSTITUTE").length;
  const statCount = match.playerStats.length;
  const goalsFor = match.goalsFor ?? null;
  const goalsAgainst = match.goalsAgainst ?? null;
  const eventDate = match.calendarEvent ? formatDateTime(match.calendarEvent.startsAt) : "Spiel ohne Kalendertermin";
  const formationSlots = (match.tactic?.slots ?? [])
    .filter((slot) => slot.phase === "OFFENSE")
    .map((slot) => ({
      id: slot.id,
      x: slot.x,
      y: slot.y,
      positionCode: slot.positionCode,
      playerProfileId: slot.playerProfileId,
    }));
  const canManageMatch = hasPermission(context, "match.manage", activeTeam.id);

  return (
    <AppShell context={context} activePath="/spiele">
      <div className="space-y-6 py-2">
        <Breadcrumbs items={[{ label: "Spieltage", href: "/spiele" }, { label: `vs. ${match.opponent}` }]} />
        <MatchHero
          activeTeamName={activeTeam.name}
          competition={match.competition}
          eventDate={eventDate}
          goalsAgainst={goalsAgainst}
          goalsFor={goalsFor}
          isHomeGame={match.isHomeGame}
          opponent={match.opponent}
          status={match.status}
        />

        {query.imported ? (
          <p className="rounded-lg border border-success-soft bg-success-soft px-4 py-3 text-sm font-semibold text-success">
            Spieltagsdaten wurden importiert.
          </p>
        ) : null}
        {query.error === "stat-values" ? (
          <p className="rounded-lg bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            Bitte pruefe Minuten, Karten, Tore und Bewertung. Eingesetzte Spieler brauchen eine Note zwischen 1.0 und 10.0; bei Nicht eingesetzt und 0 Minuten kann die Note leer bleiben.
          </p>
        ) : null}
        {query.error === "score" ? (
          <p className="rounded-lg bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            Ergebnisse duerfen nicht negativ sein.
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-4">
            <form action={updateMatchResult} className="rounded-lg border border-border bg-surface p-5">
              <input name="matchId" type="hidden" value={match.id} />
              <SectionTitle icon={<ClipboardPen className="size-5 text-primary" aria-hidden="true" />} title="Match Result" />
              <div className="mt-5 grid grid-cols-2 gap-3">
                <NumberField label="Tore fuer" name="goalsFor" defaultValue={match.goalsFor} />
                <NumberField label="Tore gegen" name="goalsAgainst" defaultValue={match.goalsAgainst} />
              </div>
              <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor="status">
                Status
                <select className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" defaultValue={match.status} id="status" name="status">
                  <option value="PLANNED">Geplant</option>
                  <option value="LIVE">Live</option>
                  <option value="FINISHED">Beendet</option>
                  <option value="CANCELLED">Abgesagt</option>
                </select>
              </label>
              <button className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white" type="submit">
                <Save className="size-4" aria-hidden="true" />
                Ergebnis speichern
              </button>
            </form>

            <article className="rounded-lg border border-border bg-surface p-5">
              <SectionTitle icon={<BarChart3 className="size-5 text-primary" aria-hidden="true" />} title="Spielstatus" />
              <div className="mt-5 grid gap-3">
                <SideMetric label="Eingesetzt" value={`${playedRows.length}/${playerRows.length}`} />
                <SideMetric label="Startelf" value={starterCount.toString()} />
                <SideMetric label="Einwechslungen" value={substituteCount.toString()} />
                <SideMetric label="Gespeicherte Werte" value={statCount.toString()} />
                {unavailablePlayerIds.size > 0 ? (
                  <SideMetric label="Nicht verfuegbar" value={unavailablePlayerIds.size.toString()} />
                ) : null}
              </div>
            </article>

            {canManageMatch ? (
              <form action={updateMatchTactic} className="rounded-lg border border-border bg-surface p-5">
                <input name="matchId" type="hidden" value={match.id} />
                <SectionTitle icon={<LayoutGrid className="size-5 text-primary" aria-hidden="true" />} title="Taktik" />
                {tactics.length > 0 ? (
                  <>
                    <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor="tacticId">
                      Formation fuer dieses Spiel
                      <select
                        className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm"
                        defaultValue={match.tacticId ?? ""}
                        id="tacticId"
                        name="tacticId"
                      >
                        <option value="">Keine ausgewaehlt</option>
                        {tactics.map((tactic) => (
                          <option key={tactic.id} value={tactic.id}>
                            {tactic.name} ({tactic.formation})
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white" type="submit">
                      <Save className="size-4" aria-hidden="true" />
                      Taktik uebernehmen
                    </button>
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-muted">
                    Noch keine Taktik angelegt. Im{" "}
                    <a className="font-semibold text-primary underline" href="/taktik">
                      Aufstellungsplaner
                    </a>{" "}
                    kannst du eine Formation erstellen und hier zuweisen.
                  </p>
                )}
              </form>
            ) : null}
          </aside>

          <form action={updateAllPlayerMatchStats} className="space-y-6">
            <input name="matchId" type="hidden" value={match.id} />
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Spielerstatistiken</p>
                <h2 className="mt-1 text-2xl font-bold text-foreground">Matchday Squad</h2>
                <p className="mt-1 text-sm text-muted">
                  Startelf oben im Feld anklicken, Einwechslungen unten in der Kaderliste festlegen. Abwesende Spieler
                  (Verletzung, Urlaub etc.) werden ausgeblendet. Aenderungen fuer alle Spieler auf einmal speichern.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="rounded-full bg-primary-soft px-3 py-1 text-primary">{playedRows.length} eingesetzt</span>
                <span className="rounded-full bg-surface-muted px-3 py-1 text-foreground">{playerRows.length - playedRows.length} ohne Einsatz</span>
                <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white" type="submit">
                  <Save className="size-4" aria-hidden="true" />
                  Alle speichern
                </button>
              </div>
            </div>

            <MatchLineupEditor
              formationSlots={formationSlots}
              players={playerRows}
              tacticFormation={match.tactic?.formation ?? null}
              tacticName={match.tactic?.name ?? null}
            />
          </form>
        </div>
      </div>
    </AppShell>
  );
}

function MatchHero({
  activeTeamName,
  competition,
  eventDate,
  goalsAgainst,
  goalsFor,
  isHomeGame,
  opponent,
  status,
}: {
  activeTeamName: string;
  competition: string;
  eventDate: string;
  goalsAgainst: number | null;
  goalsFor: number | null;
  isHomeGame: boolean;
  opponent: string;
  status: string;
}) {
  const homeName = isHomeGame ? activeTeamName : opponent;
  const awayName = isHomeGame ? opponent : activeTeamName;
  const homeGoals = isHomeGame ? goalsFor : goalsAgainst;
  const awayGoals = isHomeGame ? goalsAgainst : goalsFor;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 p-5 text-white shadow-sm">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-center gap-2">
          <span className="rounded-full border border-rose-400/40 bg-rose-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-100">
            {statusLabel(status)}
          </span>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-200">
            {matchCompetitionLabel(competition)}
          </span>
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-slate-300">
          <CalendarClock className="size-4" aria-hidden="true" />
          {eventDate}
        </p>
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-8">
          <TeamBlock align="right" name={homeName} />
          <div className="text-center">
            <p className="text-4xl font-black tabular-nums tracking-normal md:text-5xl">
              {homeGoals ?? "-"} - {awayGoals ?? "-"}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">FT</p>
          </div>
          <TeamBlock align="left" name={awayName} />
        </div>
      </div>
    </section>
  );
}

function TeamBlock({ align, name }: { align: "left" | "right"; name: string }) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "justify-end text-right" : "justify-start text-left"}`}>
      {align === "left" ? <TeamBadge name={name} /> : null}
      <div>
        <p className="text-lg font-bold text-white md:text-2xl">{name}</p>
        <p className="mt-1 text-xs font-semibold uppercase text-slate-400">{align === "right" ? "Heim" : "Gast"}</p>
      </div>
      {align === "right" ? <TeamBadge name={name} /> : null}
    </div>
  );
}

function TeamBadge({ name }: { name: string }) {
  return (
    <div className="hidden size-14 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-black text-white sm:flex">
      {getInitialsFromName(name)}
    </div>
  );
}

function NumberField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: number | null;
}) {
  return (
    <label className="text-sm font-semibold text-foreground">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm font-bold tabular-nums"
        defaultValue={defaultValue ?? ""}
        min={0}
        name={name}
        type="number"
      />
    </label>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border pb-4">
      {icon}
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
    </div>
  );
}

function SideMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-muted px-3 py-2">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className="font-black tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function lineupRank(value: string) {
  if (value === "STARTER") {
    return 0;
  }

  if (value === "SUBSTITUTE") {
    return 1;
  }

  return 2;
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

  if (["FL", "ST", "LA", "RA", "LW", "RW", "CF"].includes(normalized)) {
    return 3;
  }

  return 4;
}


function statusLabel(value: string) {
  const labels: Record<string, string> = {
    CANCELLED: "Abgesagt",
    FINISHED: "Match Finished",
    LIVE: "Live",
    PLANNED: "Geplant",
  };

  return labels[value] ?? value;
}

function getInitialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
