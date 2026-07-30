import { AvailabilityForm } from "@/app/abwesenheiten/availability-form";
import { AvailabilityList } from "@/app/abwesenheiten/availability-list";
import { AppShell, EmptyState, PageHeader } from "@/components/app-shell";
import { requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

export default async function AvailabilityPage() {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
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
  const availabilities = await prisma.playerAvailability.findMany({
    where: {
      playerProfile: {
        memberships: {
          some: {
            teamId: activeTeam.id,
            status: "ACTIVE",
          },
        },
      },
    },
    include: {
      playerProfile: true,
    },
    orderBy: {
      startsAt: "desc",
    },
    take: 20,
  });

  return (
    <AppShell context={context} activePath="/abwesenheiten">
      <PageHeader
        eyebrow="Verfuegbarkeit"
        title="Abwesenheiten"
        description="Urlaub, Verletzungen und Krankheit erfassen. Betroffene Termine erhalten automatisch eine Absage."
      />

      <div className="grid gap-6 py-6 lg:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold">Abwesenheit eintragen</h2>
          {players.length > 0 ? (
            <AvailabilityForm
              players={players.map((player) => ({
                id: player.id,
                firstName: player.firstName,
                lastName: player.lastName,
              }))}
            />
          ) : (
            <div className="mt-5">
              <EmptyState title="Keine Spieler vorhanden" description="Lege zuerst Spieler im Kader an." />
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border bg-surface">
          <div className="border-b border-border p-5">
            <h2 className="text-xl font-semibold">Letzte Abwesenheiten</h2>
            <p className="mt-1 text-sm text-muted">Die letzten Eintraege fuer dieses Team.</p>
          </div>
          {availabilities.length > 0 ? (
            <AvailabilityList
              availabilities={availabilities.map((availability) => ({
                id: availability.id,
                type: availability.type,
                startsAt: availability.startsAt,
                endsAt: availability.endsAt,
                note: availability.note,
                playerName: `${availability.playerProfile.firstName} ${availability.playerProfile.lastName}`,
              }))}
            />
          ) : (
            <div className="p-5">
              <EmptyState title="Keine Abwesenheiten" description="Aktuell sind keine Abwesenheiten eingetragen." />
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
