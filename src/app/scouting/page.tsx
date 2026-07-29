import { Binoculars, Plus } from "lucide-react";
import Link from "next/link";

import { AppShell, EmptyState, PageHeader } from "@/components/app-shell";
import { ensureScoutingPermissions } from "@/lib/actions";
import { requireAppContext, requirePermission } from "@/lib/app-context";
import { getInitials } from "@/lib/format";
import { prisma } from "@/lib/prisma";

import { ScoutingTable } from "./scouting-table";

export default async function ScoutingPage() {
  const context = await requireAppContext();
  await ensureScoutingPermissions(context.club.id);
  requirePermission(context, "scouting.read", context.activeTeam?.id);

  const prospects = await prisma.scoutingProspect.findMany({
    where: {
      clubId: context.club.id,
    },
    include: {
      events: {
        select: {
          occurredAt: true,
        },
        orderBy: {
          occurredAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const rows = prospects.map((prospect) => ({
    id: prospect.id,
    name: `${prospect.firstName} ${prospect.lastName}`,
    initials: getInitials(prospect.firstName, prospect.lastName),
    position: prospect.position,
    currentClub: prospect.currentClub,
    status: prospect.status,
    interestLevel: prospect.interestLevel,
    lastContact: prospect.events[0]?.occurredAt.toISOString() ?? null,
  }));

  return (
    <AppShell activePath="/scouting" context={context}>
      <div className="space-y-6 py-2">
        <PageHeader
          action={
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-strong"
              href="/scouting/new"
            >
              <Plus className="size-4" aria-hidden="true" />
              Neuer Prospect
            </Link>
          }
          description="Talente und externe Spieler verfolgen, bevor sie Teil des Kaders sind."
          eyebrow="Scouting"
          title="Scouting-Prospects"
        />

        {rows.length > 0 ? (
          <ScoutingTable prospects={rows} />
        ) : (
          <EmptyState
            action={
              <Link className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" href="/scouting/new">
                <Binoculars className="size-4" aria-hidden="true" />
                Ersten Prospect anlegen
              </Link>
            }
            description="Lege den ersten Scouting-Prospect an, um Beobachtungen, Kontakte und Bewertungen zu erfassen."
            title="Noch keine Scouting-Prospects"
          />
        )}
      </div>
    </AppShell>
  );
}
