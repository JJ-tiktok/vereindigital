"use server";

import { LineupStatus, MatchStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireActiveTeam, requireAppContext, requirePermission } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

import { ensurePlayerInTeam } from "./guards";
import { parseForm, zIntWithFallback, zOptionalFloat, zOptionalInt, zRequiredString } from "./helpers";

function revalidateMatches(matchId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/spiele");

  if (matchId) {
    revalidatePath(`/spiele/${matchId}`);
  }
}

export async function updateMatchTactic(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "match.manage", activeTeam.id);

  const matchId = String(formData.get("matchId") ?? "");
  const tacticIdRaw = String(formData.get("tacticId") ?? "").trim();

  if (!matchId) {
    redirect("/spiele");
  }

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      teamId: activeTeam.id,
    },
    select: {
      id: true,
      tacticId: true,
      _count: { select: { lineupSlots: true } },
    },
  });

  if (!match) {
    redirect("/spiele");
  }

  let tacticId: string | null = null;
  let offenseSlots: { positionCode: string; x: number; y: number; sortOrder: number; playerProfileId: string | null }[] = [];

  if (tacticIdRaw) {
    const tactic = await prisma.tactic.findFirst({
      where: {
        id: tacticIdRaw,
        teamId: activeTeam.id,
      },
      select: {
        id: true,
        slots: {
          where: { phase: "OFFENSE" },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (tactic) {
      tacticId = tactic.id;
      offenseSlots = tactic.slots.map((slot) => ({
        positionCode: slot.positionCode,
        x: slot.x,
        y: slot.y,
        sortOrder: slot.sortOrder,
        playerProfileId: slot.playerProfileId,
      }));
    }
  }

  // Assigning a Tactic snapshots its OFFENSE slots into match-owned MatchLineupSlot rows, so
  // that assigning players to positions for this matchday never mutates the shared Tactic
  // template (which other matches may also reference). Re-selecting the same Tactic again is a
  // no-op for the snapshot, preserving any per-match player assignments already made - unless
  // the match's tacticId was already set but never got a snapshot (e.g. matches that had a
  // tactic assigned before MatchLineupSlot existed), in which case it's backfilled here.
  const tacticChanged = tacticId !== match.tacticId;
  const missingSnapshot = tacticId !== null && match._count.lineupSlots === 0;

  if (tacticChanged || missingSnapshot) {
    await prisma.$transaction(async (tx) => {
      await tx.match.update({ where: { id: matchId }, data: { tacticId } });
      await tx.matchLineupSlot.deleteMany({ where: { matchId } });

      if (offenseSlots.length > 0) {
        await tx.matchLineupSlot.createMany({
          data: offenseSlots.map((slot) => ({ matchId, ...slot })),
        });
      }
    });
  }

  revalidateMatches(matchId);
}

export async function assignMatchLineupSlotPlayer(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "match.manage", activeTeam.id);

  const slotId = String(formData.get("slotId") ?? "").trim();
  const matchId = String(formData.get("matchId") ?? "").trim();
  const rawPlayerProfileId = String(formData.get("playerProfileId") ?? "").trim();

  if (!slotId || !matchId) {
    return;
  }

  const slot = await prisma.matchLineupSlot.findFirst({
    where: { id: slotId, matchId, match: { teamId: activeTeam.id } },
  });

  if (!slot) {
    return;
  }

  let playerProfileId: string | null = null;

  if (rawPlayerProfileId) {
    const player = await prisma.playerProfile.findFirst({
      where: {
        id: rawPlayerProfileId,
        memberships: { some: { teamId: activeTeam.id } },
      },
    });
    playerProfileId = player?.id ?? null;
  }

  await prisma.matchLineupSlot.update({
    where: { id: slotId },
    data: { playerProfileId },
  });

  revalidateMatches(matchId);
}

const matchResultSchema = z.object({
  matchId: zRequiredString,
  goalsFor: zOptionalInt,
  goalsAgainst: zOptionalInt,
  status: z.enum(MatchStatus).default("PLANNED").catch("PLANNED"),
});

export async function updateMatchResult(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "match.manage", activeTeam.id);

  const parsed = parseForm(formData, matchResultSchema);

  if (!parsed.success) {
    redirect("/spiele");
  }

  const { matchId, goalsFor, goalsAgainst, status } = parsed.data;

  if ((goalsFor !== null && goalsFor < 0) || (goalsAgainst !== null && goalsAgainst < 0)) {
    redirect(`/spiele/${matchId}?error=score`);
  }

  await prisma.match.update({
    where: {
      id: matchId,
      teamId: activeTeam.id,
    },
    data: {
      goalsFor,
      goalsAgainst,
      status,
    },
  });

  revalidateMatches(matchId);
}

const matchStatSchema = z.object({
  matchId: zRequiredString,
  playerProfileId: zRequiredString,
  lineupStatus: z.enum(LineupStatus),
  goals: zIntWithFallback(0),
  assists: zIntWithFallback(0),
  yellowCards: zIntWithFallback(0),
  redCards: zIntWithFallback(0),
  minutesPlayed: zIntWithFallback(0),
  rating: zOptionalFloat,
});

export async function updatePlayerMatchStat(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "match.stats.manage", activeTeam.id);

  const parsed = parseForm(formData, matchStatSchema);

  if (!parsed.success) {
    redirect("/spiele");
  }

  const { matchId, playerProfileId, lineupStatus, goals, assists, yellowCards, redCards, minutesPlayed } =
    parsed.data;
  const played = lineupStatus !== LineupStatus.NOT_USED || minutesPlayed > 0;
  const rawRating = String(formData.get("rating") ?? "").trim();
  const rating = !played && (!rawRating || rawRating === "0") ? null : parsed.data.rating;

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      teamId: activeTeam.id,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!match) {
    redirect("/spiele");
  }

  await ensurePlayerInTeam(playerProfileId, activeTeam.id, context.club.id);

  // A rating is only meaningful once the match has actually been played - requiring it while
  // still setting up the lineup for a PLANNED/LIVE match would force coaches to invent a score
  // before kickoff just to save who's starting.
  const ratingRequired = match.status === MatchStatus.FINISHED;

  if (
    goals < 0 ||
    assists < 0 ||
    yellowCards < 0 ||
    redCards < 0 ||
    minutesPlayed < 0 ||
    minutesPlayed > 120 ||
    (ratingRequired && played && rating === null) ||
    (rating !== null && (rating < 1 || rating > 10))
  ) {
    redirect(`/spiele/${matchId}?error=stat-values`);
  }

  await prisma.playerMatchStat.upsert({
    where: {
      matchId_playerProfileId: {
        matchId,
        playerProfileId,
      },
    },
    create: {
      matchId,
      playerProfileId,
      goals,
      assists,
      yellowCards,
      redCards,
      minutesPlayed,
      lineupStatus,
      rating,
    },
    update: {
      goals,
      assists,
      yellowCards,
      redCards,
      minutesPlayed,
      lineupStatus,
      rating,
    },
  });

  revalidateMatches(matchId);
}

export async function updateAllPlayerMatchStats(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "match.stats.manage", activeTeam.id);

  const matchId = String(formData.get("matchId") ?? "");
  const playerProfileIds = formData.getAll("playerProfileId").map((value) => String(value));

  if (!matchId || playerProfileIds.length === 0) {
    redirect("/spiele");
  }

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      teamId: activeTeam.id,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!match) {
    redirect("/spiele");
  }

  // A rating is only meaningful once the match has actually been played - requiring it while
  // still setting up the lineup for a PLANNED/LIVE match would force coaches to invent a score
  // before kickoff just to save who's starting.
  const ratingRequired = match.status === MatchStatus.FINISHED;

  const rows = playerProfileIds.map((playerProfileId) => {
    const readInt = (field: string, fallback: number) => {
      const raw = String(formData.get(`${field}-${playerProfileId}`) ?? "").trim();
      const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
      return Number.isNaN(parsed) ? fallback : parsed;
    };
    const lineupStatusRaw = String(formData.get(`lineupStatus-${playerProfileId}`) ?? "");
    const lineupStatus = lineupStatusRaw in LineupStatus ? (lineupStatusRaw as LineupStatus) : LineupStatus.NOT_USED;
    const goals = readInt("goals", 0);
    const assists = readInt("assists", 0);
    const yellowCards = readInt("yellowCards", 0);
    const redCards = readInt("redCards", 0);
    const minutesPlayed = readInt("minutesPlayed", 0);
    const played = lineupStatus !== LineupStatus.NOT_USED || minutesPlayed > 0;
    const rawRating = String(formData.get(`rating-${playerProfileId}`) ?? "").trim();
    const parsedRating = rawRating ? Number.parseFloat(rawRating.replace(",", ".")) : Number.NaN;
    const rating = !played && (!rawRating || rawRating === "0") ? null : Number.isNaN(parsedRating) ? null : parsedRating;

    return { playerProfileId, lineupStatus, goals, assists, yellowCards, redCards, minutesPlayed, played, rating };
  });

  const hasInvalidRow = rows.some(
    (row) =>
      row.goals < 0 ||
      row.assists < 0 ||
      row.yellowCards < 0 ||
      row.redCards < 0 ||
      row.minutesPlayed < 0 ||
      row.minutesPlayed > 120 ||
      (ratingRequired && row.played && row.rating === null) ||
      (row.rating !== null && (row.rating < 1 || row.rating > 10)),
  );

  if (hasInvalidRow) {
    redirect(`/spiele/${matchId}?error=stat-values`);
  }

  for (const row of rows) {
    await ensurePlayerInTeam(row.playerProfileId, activeTeam.id, context.club.id);
  }

  await prisma.$transaction(
    rows.map((row) =>
      prisma.playerMatchStat.upsert({
        where: {
          matchId_playerProfileId: {
            matchId,
            playerProfileId: row.playerProfileId,
          },
        },
        create: {
          matchId,
          playerProfileId: row.playerProfileId,
          goals: row.goals,
          assists: row.assists,
          yellowCards: row.yellowCards,
          redCards: row.redCards,
          minutesPlayed: row.minutesPlayed,
          lineupStatus: row.lineupStatus,
          rating: row.rating,
        },
        update: {
          goals: row.goals,
          assists: row.assists,
          yellowCards: row.yellowCards,
          redCards: row.redCards,
          minutesPlayed: row.minutesPlayed,
          lineupStatus: row.lineupStatus,
          rating: row.rating,
        },
      }),
    ),
  );

  revalidateMatches(matchId);
}
