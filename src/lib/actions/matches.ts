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

  const { matchId, playerProfileId, lineupStatus, goals, assists, yellowCards, redCards, minutesPlayed, rating } =
    parsed.data;

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      teamId: activeTeam.id,
    },
    select: {
      id: true,
    },
  });

  if (!match) {
    redirect("/spiele");
  }

  await ensurePlayerInTeam(playerProfileId, activeTeam.id, context.club.id);

  if (
    goals < 0 ||
    assists < 0 ||
    yellowCards < 0 ||
    redCards < 0 ||
    minutesPlayed < 0 ||
    minutesPlayed > 120 ||
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
