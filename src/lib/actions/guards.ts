import "server-only";

import { CalendarEventType, type Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { availabilityReason } from "./helpers";

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

export async function applyAvailabilityDeclines(
  tx: Prisma.TransactionClient,
  params: {
    teamId: string;
    startsAt: Date;
    endsAt: Date;
    calendarEventId: string;
    setByUserId: string;
  },
) {
  const overlappingAvailabilities = await tx.playerAvailability.findMany({
    where: {
      startsAt: {
        lte: params.endsAt,
      },
      OR: [{ endsAt: null }, { endsAt: { gte: params.startsAt } }],
      playerProfile: {
        memberships: {
          some: {
            teamId: params.teamId,
            status: "ACTIVE",
            role: {
              key: "player",
            },
          },
        },
      },
    },
    select: {
      playerProfileId: true,
      type: true,
      note: true,
    },
  });

  if (overlappingAvailabilities.length > 0) {
    await tx.eventAttendance.createMany({
      data: overlappingAvailabilities.map((availability) => ({
        calendarEventId: params.calendarEventId,
        playerProfileId: availability.playerProfileId,
        status: "DECLINED" as const,
        reason: availability.note || availabilityReason(availability.type),
        setByUserId: params.setByUserId,
      })),
      skipDuplicates: true,
    });
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
