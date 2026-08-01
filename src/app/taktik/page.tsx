import Link from "next/link";

import { AppShell, PageHeader } from "@/components/app-shell";
import { PlayerTabs } from "@/components/player-tabs";
import { ensureTacticsPermissions } from "@/lib/actions";
import { requireActiveTeam, requireAppContext, requirePermission } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";
import type { PositionCode } from "@/lib/tactics";
import { TacticsPlanner, type SavedTactic, type SquadPlayer } from "@/app/taktik/tactics-planner";
import { tacticSceneCategoryLabel } from "@/lib/labels";

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

  const scenes = await prisma.tacticScene.findMany({
    where: { teamId: activeTeam.id },
    select: { id: true, title: true, category: true, _count: { select: { steps: true } } },
    orderBy: { updatedAt: "desc" },
    take: 6,
  });

  const aufstellungenTab = (
    <TacticsPlanner initialTacticId={initialTacticId} key={initialTacticId ?? "new"} savedTactics={savedTactics} squad={squad} />
  );

  const szenenTab = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-5">
        <div>
          <p className="text-sm text-muted">
            Animierte Taktik-Szenen (Standards, Verteidigung, Angriff, nachgebaute Spielszenen) mit klassischen
            Analyse-Werkzeugen bauen und der Mannschaft praesentieren.
          </p>
        </div>
        <Link className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white" href="/taktik/szenen">
          Szenen-Bibliothek oeffnen
        </Link>
      </div>
      {scenes.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {scenes.map((scene) => (
            <Link className="rounded-lg border border-border bg-surface p-4 transition hover:border-primary" href={`/taktik/szenen/${scene.id}`} key={scene.id}>
              <p className="text-xs font-bold uppercase tracking-wide text-primary">{tacticSceneCategoryLabel(scene.category)}</p>
              <p className="mt-1 font-bold text-foreground">{scene.title}</p>
              <p className="mt-1 text-sm text-muted">{scene._count.steps} Schritt{scene._count.steps === 1 ? "" : "e"}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-surface-muted p-5 text-sm text-muted">
          Noch keine Szenen angelegt. Oeffne die Bibliothek, um die erste Szene zu bauen.
        </p>
      )}
    </div>
  );

  return (
    <AppShell context={context} activePath="/taktik">
      <PageHeader
        eyebrow="Training"
        title="Aufstellungsplaner"
        description="Formationen und Taktiken planen, Spieler positionieren und Laufwege fuer Offensiv- und Defensiv-Phase einzeichnen."
      />
      <div className="py-6">
        <PlayerTabs
          tabs={[
            { id: "aufstellungen", label: "Aufstellungen", content: aufstellungenTab },
            { id: "szenen", label: "Szenen", content: szenenTab },
          ]}
        />
      </div>
    </AppShell>
  );
}
