import { notFound } from "next/navigation";

import { AppShell, Breadcrumbs, PageHeader } from "@/components/app-shell";
import { EventForm } from "@/app/kalender/event-form";
import { hasPermission, requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

export default async function EditCalendarEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);

  if (!hasPermission(context, "calendar.events.manage", activeTeam.id)) {
    notFound();
  }

  const { eventId } = await params;
  const event = await prisma.calendarEvent.findFirst({
    where: {
      id: eventId,
      teamId: activeTeam.id,
    },
    include: {
      match: true,
    },
  });

  if (!event) {
    notFound();
  }

  return (
    <AppShell context={context} activePath="/kalender">
      <Breadcrumbs
        items={[
          { label: "Kalender", href: "/kalender" },
          { label: event.title, href: `/kalender/${event.id}` },
          { label: "Bearbeiten" },
        ]}
      />
      <PageHeader eyebrow="Teamkalender" title="Termin bearbeiten" description={event.title} />
      <div className="py-6">
        <EventForm
          event={{
            id: event.id,
            type: event.type,
            title: event.title,
            description: event.description,
            location: event.location,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            match: event.match
              ? { opponent: event.match.opponent, isHomeGame: event.match.isHomeGame, competition: event.match.competition }
              : null,
          }}
        />
      </div>
    </AppShell>
  );
}
