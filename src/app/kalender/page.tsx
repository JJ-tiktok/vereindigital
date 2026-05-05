import { Plus } from "lucide-react";
import Link from "next/link";

import { AppShell, PageHeader } from "@/components/app-shell";
import { CalendarGrid } from "@/app/kalender/calendar-grid";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { formatDateTime } from "@/lib/format";
import { eventTypeLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function CalendarPage() {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const events = await prisma.calendarEvent.findMany({
    where: {
      teamId: activeTeam.id,
    },
    include: {
      attendances: true,
      match: true,
    },
    orderBy: {
      startsAt: "asc",
    },
  });

  return (
    <AppShell context={context} activePath="/kalender">
      <PageHeader
        eyebrow="Teamkalender"
        title={`Kalender ${activeTeam.name}`}
        description="Trainingseinheiten, Spiele und Team-Events."
        action={
          <Link className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-strong" href="/kalender/new">
            <Plus className="size-4" aria-hidden="true" />
            Termin erstellen
          </Link>
        }
      />

      <section className="space-y-6 py-6">
        <CalendarGrid events={events} />

        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="border-b border-border p-5">
            <h2 className="text-xl font-semibold">Terminliste</h2>
            <p className="mt-1 text-sm text-muted">Alle Termine des aktiven Teams.</p>
          </div>
          {events.length > 0 ? (
            <div className="divide-y divide-border">
              {events.map((event) => (
                <Link className="grid gap-4 p-5 transition hover:bg-slate-50 md:grid-cols-[140px_1fr_180px]" href={`/kalender/${event.id}`} key={event.id}>
                  <div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
                      {eventTypeLabel(event.type)}
                    </span>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{formatDateTime(event.startsAt)}</p>
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-950">{event.title}</h2>
                    <p className="mt-1 text-sm text-muted">{event.location || "Kein Ort hinterlegt"}</p>
                    {event.match ? <p className="mt-1 text-sm text-muted">Gegner: {event.match.opponent}</p> : null}
                  </div>
                  <div className="text-sm text-muted">{event.attendances.length} Rueckmeldungen</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-5 text-sm text-muted">
              Noch keine Termine. Klicke im Kalender auf einen Tag, um den ersten Termin zu erstellen.
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
