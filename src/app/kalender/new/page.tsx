import { AppShell, PageHeader } from "@/components/app-shell";
import { EventForm } from "@/app/kalender/event-form";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";

export default async function NewCalendarEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; date?: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const params = await searchParams;

  return (
    <AppShell context={context} activePath="/kalender">
      <PageHeader
        eyebrow="Teamkalender"
        title="Termin erstellen"
        description={`Neuen Termin fuer ${activeTeam.name} anlegen.`}
      />
      <div className="py-6">
        <EventForm error={params.error} selectedDate={params.date} />
      </div>
    </AppShell>
  );
}
