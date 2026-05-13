import { BarChart3, CalendarClock, CircleDot, ClipboardPen, Save, Shield } from "lucide-react";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { updateMatchResult, updatePlayerMatchStat } from "@/lib/actions";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { formatDateTime, getInitials } from "@/lib/format";
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
    },
  });

  if (!match) {
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
  const statByPlayer = new Map(match.playerStats.map((stat) => [stat.playerProfileId, stat]));
  const playerRows = players
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
        position: player.position,
        rating: stat?.rating ?? null,
        redCards: stat?.redCards ?? 0,
        saved: Boolean(stat),
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

  return (
    <AppShell context={context} activePath="/spiele">
      <div className="space-y-6 py-2">
        <MatchHero
          activeTeamName={activeTeam.name}
          eventDate={eventDate}
          goalsAgainst={goalsAgainst}
          goalsFor={goalsFor}
          isHomeGame={match.isHomeGame}
          opponent={match.opponent}
          status={match.status}
        />

        <LineupField players={playedRows} />

        {query.imported ? (
          <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Spieltagsdaten wurden importiert.
          </p>
        ) : null}
        {query.error === "stat-values" ? (
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            Bitte pruefe Minuten, Karten, Tore und Bewertung. Eingesetzte Spieler brauchen eine Note zwischen 1.0 und 10.0; bei Nicht eingesetzt und 0 Minuten kann die Note leer bleiben.
          </p>
        ) : null}
        {query.error === "score" ? (
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            Ergebnisse duerfen nicht negativ sein.
          </p>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
          <aside className="space-y-4">
            <form action={updateMatchResult} className="rounded-lg border border-border bg-white p-5">
              <input name="matchId" type="hidden" value={match.id} />
              <SectionTitle icon={<ClipboardPen className="size-5 text-primary" aria-hidden="true" />} title="Match Result" />
              <div className="mt-5 grid grid-cols-2 gap-3">
                <NumberField label="Tore fuer" name="goalsFor" defaultValue={match.goalsFor} />
                <NumberField label="Tore gegen" name="goalsAgainst" defaultValue={match.goalsAgainst} />
              </div>
              <label className="mt-4 block text-sm font-semibold text-slate-800" htmlFor="status">
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

            <article className="rounded-lg border border-border bg-white p-5">
              <SectionTitle icon={<BarChart3 className="size-5 text-primary" aria-hidden="true" />} title="Spielstatus" />
              <div className="mt-5 grid gap-3">
                <SideMetric label="Eingesetzt" value={`${playedRows.length}/${players.length}`} />
                <SideMetric label="Startelf" value={starterCount.toString()} />
                <SideMetric label="Einwechslungen" value={substituteCount.toString()} />
                <SideMetric label="Gespeicherte Werte" value={statCount.toString()} />
              </div>
            </article>

            <article className="rounded-lg border border-border bg-white p-5">
              <SectionTitle icon={<Shield className="size-5 text-primary" aria-hidden="true" />} title="Kurzfazit" />
              <p className="mt-4 text-sm leading-6 text-muted">
                Die Liste rechts ist nach Einsatz sortiert. Spieler mit Minuten, Startelf oder Einwechslung stehen oben; nicht eingesetzte Spieler bleiben fuer den vollstaendigen Spieltagskader erhalten.
              </p>
            </article>
          </aside>

          <section className="overflow-hidden rounded-lg border border-border bg-white">
            <div className="border-b border-border p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">Spielerstatistiken</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">Matchday Squad</h2>
                  <p className="mt-1 text-sm text-muted">Eingesetzte Spieler oben, komplette Kaderpflege darunter.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-primary">{playedRows.length} eingesetzt</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{players.length - playedRows.length} ohne Einsatz</span>
                </div>
              </div>
            </div>

            <div className="divide-y divide-border">
              {playerRows.map((player) => (
                <PlayerStatRow key={player.id} matchId={match.id} player={player} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function MatchHero({
  activeTeamName,
  eventDate,
  goalsAgainst,
  goalsFor,
  isHomeGame,
  opponent,
  status,
}: {
  activeTeamName: string;
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
        <div className="flex items-center justify-center">
          <span className="rounded-full border border-rose-400/40 bg-rose-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-100">
            {statusLabel(status)}
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

function PlayerStatRow({
  matchId,
  player,
}: {
  matchId: string;
  player: {
    assists: number;
    goals: number;
    id: string;
    initials: string;
    jerseyNumber: number | null;
    lineupStatus: string;
    minutesPlayed: number;
    name: string;
    played: boolean;
    position: string;
    rating: number | null;
    redCards: number;
    saved: boolean;
    yellowCards: number;
  };
}) {
  return (
    <form
      action={updatePlayerMatchStat}
      className={`grid gap-3 p-4 transition hover:bg-slate-50 lg:grid-cols-[minmax(220px,1fr)_120px_62px_52px_52px_58px_58px_70px_92px] lg:items-center ${
        player.played ? "bg-white" : "bg-slate-50/50"
      }`}
    >
      <input name="matchId" type="hidden" value={matchId} />
      <input name="playerProfileId" type="hidden" value={player.id} />
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${player.played ? "bg-blue-50 text-primary" : "bg-slate-100 text-slate-600"}`}>
          {player.jerseyNumber ?? player.initials}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-bold text-slate-950">{player.name}</p>
            {player.played ? <CircleDot className="size-3 text-primary" aria-hidden="true" /> : null}
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">{player.position}</p>
        </div>
      </div>
      <label className="text-xs font-semibold uppercase text-muted">
        Status
        <select className="mt-1 h-9 w-full rounded-lg border border-border bg-white px-2 text-sm font-normal text-slate-900" defaultValue={player.lineupStatus} name="lineupStatus">
          <option value="STARTER">Startelf</option>
          <option value="SUBSTITUTE">Einwechslung</option>
          <option value="NOT_USED">Nicht eingesetzt</option>
        </select>
      </label>
      <CompactNumber name="minutesPlayed" label="Min" value={player.minutesPlayed} max={120} />
      <CompactNumber name="goals" label="T" value={player.goals} />
      <CompactNumber name="assists" label="V" value={player.assists} />
      <CompactNumber name="yellowCards" label="Gelb" value={player.yellowCards} accent={player.yellowCards > 0 ? "yellow" : undefined} />
      <CompactNumber name="redCards" label="Rot" value={player.redCards} accent={player.redCards > 0 ? "red" : undefined} />
      <CompactNumber name="rating" label="Note" value={player.rating ?? undefined} max={10} step="0.1" />
      <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 text-sm font-bold text-primary transition hover:bg-blue-100" formNoValidate type="submit">
        <Save className="size-4" aria-hidden="true" />
        Save
      </button>
    </form>
  );
}

function LineupField({
  players,
}: {
  players: {
    id: string;
    jerseyNumber: number | null;
    name: string;
    position: string;
    rating: number | null;
  }[];
}) {
  const groups = [
    { key: "attack", label: "Angriff", players: players.filter((player) => positionLine(player.position) === "attack") },
    { key: "midfield", label: "Mittelfeld", players: players.filter((player) => positionLine(player.position) === "midfield") },
    { key: "defense", label: "Abwehr", players: players.filter((player) => positionLine(player.position) === "defense") },
    { key: "goalkeeper", label: "Tor", players: players.filter((player) => positionLine(player.position) === "goalkeeper") },
  ];

  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <div className="flex flex-col gap-2 border-b border-border pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Aufstellung</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Positionsuebersicht</h2>
        </div>
        <p className="text-sm text-muted">Eingesetzte Spieler nach Mannschaftsteil, ohne taktische Formation.</p>
      </div>
      <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-[linear-gradient(90deg,#78b66b_0_10%,#8bc77d_10%_20%,#78b66b_20%_30%,#8bc77d_30%_40%,#78b66b_40%_50%,#8bc77d_50%_60%,#78b66b_60%_70%,#8bc77d_70%_80%,#78b66b_80%_90%,#8bc77d_90%_100%)] p-4">
        <div className="relative grid min-h-[310px] gap-3 rounded-md border-2 border-white/80 p-4">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t-2 border-white/70" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70" />
          {groups.map((group) => (
            <div className="relative z-10 grid grid-cols-[86px_1fr] items-center gap-3" key={group.key}>
              <p className="rounded-full bg-white/85 px-3 py-1 text-center text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm">
                {group.label}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {group.players.length > 0 ? (
                  group.players.map((player) => <ShirtPlayer key={player.id} player={player} />)
                ) : (
                  <span className="rounded-full bg-white/50 px-3 py-1 text-xs font-semibold text-white">Keine Spieler</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShirtPlayer({
  player,
}: {
  player: {
    jerseyNumber: number | null;
    name: string;
    position: string;
    rating: number | null;
  };
}) {
  return (
    <div className="flex min-w-20 flex-col items-center gap-1">
      <div className="relative flex h-12 w-14 items-center justify-center rounded-b-lg rounded-t-sm bg-primary text-lg font-black tabular-nums text-white shadow-md before:absolute before:-left-2 before:top-1 before:size-5 before:rounded-sm before:bg-primary after:absolute after:-right-2 after:top-1 after:size-5 after:rounded-sm after:bg-primary">
        {player.jerseyNumber ?? "-"}
      </div>
      <p className="max-w-24 truncate rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-slate-900">{shortPlayerName(player.name)}</p>
      <p className="rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
        {player.position}
        {player.rating ? ` / ${player.rating.toFixed(1)}` : ""}
      </p>
    </div>
  );
}

function CompactNumber({
  accent,
  label,
  max,
  name,
  step = "1",
  value,
}: {
  accent?: "red" | "yellow";
  label: string;
  max?: number;
  name: string;
  step?: string;
  value?: number;
}) {
  const accentClass = accent === "yellow" ? "border-amber-300 bg-amber-50" : accent === "red" ? "border-rose-300 bg-rose-50" : "border-border bg-white";

  return (
    <label className="text-xs font-semibold uppercase text-muted">
      {label}
      <input
        className={`mt-1 h-9 w-full rounded-lg border px-2 text-sm font-semibold tabular-nums text-slate-900 ${accentClass}`}
        defaultValue={value ?? ""}
        max={max}
        min={0}
        name={name}
        step={step}
        type="number"
      />
    </label>
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
    <label className="text-sm font-semibold text-slate-800">
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
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
    </div>
  );
}

function SideMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className="font-black tabular-nums text-slate-950">{value}</span>
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

function positionLine(position: string) {
  const rank = positionRank(position);

  if (rank === 0) {
    return "goalkeeper";
  }

  if (rank === 1) {
    return "defense";
  }

  if (rank === 2) {
    return "midfield";
  }

  return "attack";
}

function shortPlayerName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return name;
  }

  return parts.at(-1) ?? name;
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
