import { notFound } from "next/navigation";

import { AppShell, PageHeader } from "@/components/app-shell";
import { updateMatchResult, updatePlayerMatchStat } from "@/lib/actions";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ error?: string }>;
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

  return (
    <AppShell context={context} activePath="/spiele">
      <PageHeader
        eyebrow="Spieltag"
        title={`${activeTeam.name} ${match.isHomeGame ? "gegen" : "bei"} ${match.opponent}`}
        description={match.calendarEvent ? formatDateTime(match.calendarEvent.startsAt) : "Spiel ohne Kalendertermin"}
      />

      <div className="grid gap-6 py-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <form action={updateMatchResult} className="rounded-lg border border-border bg-white p-5">
            <input name="matchId" type="hidden" value={match.id} />
            <p className="text-xs font-semibold uppercase text-muted">Ergebnis</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <NumberField label="Tore fuer" name="goalsFor" defaultValue={match.goalsFor} />
              <NumberField label="Tore gegen" name="goalsAgainst" defaultValue={match.goalsAgainst} />
            </div>
            <div className="mt-4">
              <label className="text-sm font-semibold text-slate-800" htmlFor="status">
                Status
              </label>
              <select className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" defaultValue={match.status} id="status" name="status">
                <option value="PLANNED">Geplant</option>
                <option value="LIVE">Live</option>
                <option value="FINISHED">Beendet</option>
                <option value="CANCELLED">Abgesagt</option>
              </select>
            </div>
            <button className="mt-5 h-10 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-white" type="submit">
              Ergebnis speichern
            </button>
          </form>

          <article className="rounded-lg border border-border bg-white p-5">
            <p className="text-xs font-semibold uppercase text-muted">Statistik</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{match.playerStats.length}</p>
            <p className="mt-1 text-sm text-muted">Spieler mit gespeicherten Werten</p>
          </article>
        </aside>

        <section className="rounded-lg border border-border bg-white">
          <div className="border-b border-border p-5">
            <h2 className="text-xl font-semibold">Spielerstatistiken</h2>
            <p className="mt-1 text-sm text-muted">
              Startelf, Einsatzzeit, Tore, Vorlagen, Karten und Bewertung 1 bis 10.
            </p>
            {query.error === "stat-values" ? (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                Bitte pruefe Minuten, Karten, Tore und Bewertung. Rating muss zwischen 1.0 und 10.0 liegen.
              </p>
            ) : null}
            {query.error === "score" ? (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                Ergebnisse duerfen nicht negativ sein.
              </p>
            ) : null}
          </div>
          <div className="divide-y divide-border">
            {players.map((player) => {
              const stat = statByPlayer.get(player.id);

              return (
                <form action={updatePlayerMatchStat} className="grid gap-3 p-5 xl:grid-cols-[1fr_140px_repeat(7,80px)_110px]" key={player.id}>
                  <input name="matchId" type="hidden" value={match.id} />
                  <input name="playerProfileId" type="hidden" value={player.id} />
                  <div>
                    <p className="font-semibold text-slate-950">
                      {player.firstName} {player.lastName}
                    </p>
                    <p className="text-sm text-muted">{player.position}</p>
                  </div>
                  <select className="h-10 rounded-lg border border-border px-2 text-sm" defaultValue={stat?.lineupStatus ?? "NOT_USED"} name="lineupStatus">
                    <option value="STARTER">Startelf</option>
                    <option value="SUBSTITUTE">Einwechslung</option>
                    <option value="NOT_USED">Nicht eingesetzt</option>
                  </select>
                  <SmallNumber name="minutesPlayed" label="Min" value={stat?.minutesPlayed ?? 0} max={120} />
                  <SmallNumber name="goals" label="T" value={stat?.goals ?? 0} />
                  <SmallNumber name="assists" label="V" value={stat?.assists ?? 0} />
                  <SmallNumber name="yellowCards" label="Gelb" value={stat?.yellowCards ?? 0} />
                  <SmallNumber name="redCards" label="Rot" value={stat?.redCards ?? 0} />
                  <SmallNumber name="rating" label="Note" value={stat?.rating ?? undefined} min={1} max={10} step="0.1" />
                  <button className="h-10 rounded-lg bg-primary px-3 text-sm font-semibold text-white" type="submit">
                    Speichern
                  </button>
                </form>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
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
    <div>
      <label className="text-sm font-semibold text-slate-800" htmlFor={name}>
        {label}
      </label>
      <input
        className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm"
        defaultValue={defaultValue ?? ""}
        id={name}
        min={0}
        name={name}
        type="number"
      />
    </div>
  );
}

function SmallNumber({
  label,
  name,
  value,
  min = 0,
  max,
  step = "1",
}: {
  label: string;
  name: string;
  value?: number;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <label className="text-xs font-semibold uppercase text-muted">
      {label}
      <input
        className="mt-1 h-10 w-full rounded-lg border border-border px-2 text-sm font-normal text-slate-900"
        defaultValue={value ?? ""}
        max={max}
        min={min}
        name={name}
        step={step}
        type="number"
      />
    </label>
  );
}
