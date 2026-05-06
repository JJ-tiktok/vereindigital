import { Plus } from "lucide-react";
import Link from "next/link";

import { AppShell, PageHeader } from "@/components/app-shell";
import { CalendarGrid } from "@/app/kalender/calendar-grid";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
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

  const calendarEvents = events.map((event) => ({
    id: event.id,
    type: event.type,
    title: event.title,
    location: event.location,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    matchOpponent: event.match?.opponent ?? null,
  }));

  return (
    <AppShell context={context} activePath="/kalender">
      <PageHeader
        eyebrow="Teamkalender"
        title="Veranstaltungskalender"
        description={`Trainingseinheiten, Spiele und Team-Events fuer ${activeTeam.name}.`}
        action={
          <Link className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-strong" href="/kalender/new">
            <Plus className="size-4" aria-hidden="true" />
            Termin erstellen
          </Link>
        }
      />

      <section className="space-y-6 py-6">
        <CalendarGrid events={calendarEvents} />
      </section>
    </AppShell>
  );
}
