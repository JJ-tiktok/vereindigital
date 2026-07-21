import "server-only";

import { CalendarEventType } from "@prisma/client";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

export async function ensurePlayerInTeam(playerProfileId: string, teamId: string, clubId: string) {
  const player = await prisma.playerProfile.findFirst({
    where: {
      id: playerProfileId,
      clubId,
      memberships: {
        some: {
          teamId,
          status: "ACTIVE",
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!player) {
    redirect("/kader");
  }
}

export async function ensureTrainingExerciseAccess(exerciseId: string, clubId: string, teamId: string) {
  const exercise = await prisma.trainingExercise.findFirst({
    where: {
      id: exerciseId,
      clubId,
      OR: [{ teamId }, { teamId: null }],
    },
    select: {
      id: true,
    },
  });

  if (!exercise) {
    redirect("/training");
  }
}

export async function ensureTrainingEventAccess(calendarEventId: string, teamId: string) {
  const event = await prisma.calendarEvent.findFirst({
    where: {
      id: calendarEventId,
      teamId,
      type: CalendarEventType.TRAINING,
    },
    select: {
      id: true,
    },
  });

  if (!event) {
    redirect("/kalender");
  }
}
