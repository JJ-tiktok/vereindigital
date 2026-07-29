import { AppShell, PageHeader } from "@/components/app-shell";
import { ensureTacticsPermissions } from "@/lib/actions";
import { requireActiveTeam, requireAppContext, requirePermission } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";
import type { PositionCode } from "@/lib/tactics";
import { TacticsPlanner, type SavedTactic, type SquadPlayer } from "@/app/taktik/tactics-planner";

export default async function TaktikPage({
  searchParams,
}: {
  searchParams: Promise<{ tacticId?: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  await ensureTacticsPermissions(context.club.id);
  requirePermission(context, "tactics.read", activeTeam.id);
  const query = await searchParams;

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
      where: {
        teamId: activeTeam.id,
      },
      include: {
        slots: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        arrows: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  const squad: SquadPlayer[] = players.map((player) => ({
    id: player.id,
    name: `${player.firstName} ${player.lastName}`,
    jerseyNumber: player.jerseyNumber,
  }));

  const savedTactics: SavedTactic[] = tactics.map((tactic) => ({
    id: tactic.id,
    name: tactic.name,
    formation: tactic.formation,
    defenseFormation: tactic.defenseFormation,
    styleValue: tactic.styleValue,
    lineValue: tactic.lineValue,
    pressingValue: tactic.pressingValue,
    widthValue: tactic.widthValue,
    tempoValue: tactic.tempoValue,
    slots: {
      OFFENSE: tactic.slots
        .filter((slot) => slot.phase === "OFFENSE")
        .map((slot) => ({
          positionCode: slot.positionCode as PositionCode,
          x: slot.x,
          y: slot.y,
          role: slot.role,
          duty: slot.duty,
          playerProfileId: slot.playerProfileId,
          sortOrder: slot.sortOrder,
        })),
      DEFENSE: tactic.slots
        .filter((slot) => slot.phase === "DEFENSE")
        .map((slot) => ({
          positionCode: slot.positionCode as PositionCode,
          x: slot.x,
          y: slot.y,
          role: slot.role,
          duty: slot.duty,
          playerProfileId: slot.playerProfileId,
          sortOrder: slot.sortOrder,
        })),
    },
    arrows: tactic.arrows.map((arrow) => ({
      phase: arrow.phase,
      x1: arrow.x1,
      y1: arrow.y1,
      x2: arrow.x2,
      y2: arrow.y2,
      sortOrder: arrow.sortOrder,
    })),
  }));

  const initialTacticId = query.tacticId && savedTactics.some((tactic) => tactic.id === query.tacticId)
    ? query.tacticId
    : (savedTactics[0]?.id ?? null);

  return (
    <AppShell context={context} activePath="/taktik">
      <PageHeader
        eyebrow="Training"
        title="Aufstellungsplaner"
        description="Formationen und Taktiken planen, Spieler positionieren und Laufwege fuer Offensiv- und Defensiv-Phase einzeichnen."
      />
      <div className="py-6">
        <TacticsPlanner
          initialTacticId={initialTacticId}
          key={initialTacticId ?? "new"}
          savedTactics={savedTactics}
          squad={squad}
        />
      </div>
    </AppShell>
  );
}
