import Link from "next/link";

import { AppShell, EmptyState, PageHeader } from "@/components/app-shell";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { formatDateTime } from "@/lib/format";
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

  return (
    <AppShell context={context} activePath="/spiele">
      <PageHeader
        eyebrow="Spieltage"
        title={`Spiele ${activeTeam.name}`}
        description="Spieltermine, Ergebnisse und Spielerstatistiken."
      />

      <section className="py-6">
        {matches.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <div className="divide-y divide-border">
              {matches.map((match) => (
                <Link
                  className="grid gap-4 p-5 transition hover:bg-slate-50 md:grid-cols-[1fr_180px_160px]"
                  href={`/spiele/${match.id}`}
                  key={match.id}
                >
                  <div>
                    <p className="font-semibold text-slate-950">{match.opponent}</p>
                    <p className="mt-1 text-sm text-muted">
                      {match.calendarEvent ? formatDateTime(match.calendarEvent.startsAt) : "Ohne Kalendertermin"}
                    </p>
                  </div>
                  <div className="text-sm text-muted">{match.isHomeGame ? "Heimspiel" : "Auswaertsspiel"}</div>
                  <div className="text-sm font-semibold text-slate-950">
                    {match.goalsFor ?? "-"} : {match.goalsAgainst ?? "-"}
                  </div>
                </Link>
              ))}
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
