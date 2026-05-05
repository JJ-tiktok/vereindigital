"use server";

import {
  AttendanceStatus,
  AvailabilityType,
  CalendarEventType,
  LineupStatus,
  PlayerFileEntryType,
  TrainingExerciseCategory,
  TrainingExerciseVisibility,
  TrainingIntensity,
  TrainingPitchType,
  Prisma,
} from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTeam, requireAppContext, requireCoachingStaffTeam } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readRequiredString(formData: FormData, key: string) {
  const value = readString(formData, key);

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function readDate(formData: FormData, key: string) {
  const value = readRequiredString(formData, key);
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${key} must be a valid date.`);
  }

  return date;
}

function readOptionalDays(formData: FormData, key: string, fallback: number) {
  const value = readString(formData, key);
  const days = Number.parseInt(value, 10);

  return Number.isNaN(days) || days < 1 ? fallback : days;
}

export async function createInvitation(formData: FormData) {
  const context = await requireAppContext();
  const teamId = readRequiredString(formData, "teamId");
  const roleId = readRequiredString(formData, "roleId");
  const email = readString(formData, "email");
  const expiresInDays = readOptionalDays(formData, "expiresInDays", 14);

  if (!context.isClubAdmin) {
    requireCoachingStaffTeam(context, teamId);
  }

  const [team, role] = await Promise.all([
    prisma.team.findFirst({
      where: {
        id: teamId,
        clubId: context.club.id,
      },
      select: {
        id: true,
      },
    }),
    prisma.role.findFirst({
      where: {
        id: roleId,
        clubId: context.club.id,
        key: {
          in: ["trainer", "assistant_coach", "player"],
        },
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!team || !role) {
    redirect("/einladungen?error=invalid-selection");
  }

  await prisma.invitation.create({
    data: {
      clubId: context.club.id,
      teamId,
      roleId,
      email: email || null,
      token: randomBytes(24).toString("base64url"),
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      createdByUserId: context.appUser.id,
    },
  });

  revalidatePath("/einladungen");
  redirect("/einladungen?created=1");
}

export async function revokeInvitation(formData: FormData) {
  const context = await requireAppContext();
  const invitationId = readRequiredString(formData, "invitationId");

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      clubId: context.club.id,
    },
    select: {
      teamId: true,
    },
  });

  if (!invitation) {
    redirect("/einladungen");
  }

  if (!context.isClubAdmin && invitation.teamId) {
    requireCoachingStaffTeam(context, invitation.teamId);
  }

  await prisma.invitation.update({
    where: {
      id: invitationId,
      clubId: context.club.id,
    },
    data: {
      status: "REVOKED",
    },
  });

  revalidatePath("/einladungen");
  redirect("/einladungen");
}

export async function acceptInvitation(formData: FormData) {
  const token = readRequiredString(formData, "token");
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect(`/sign-in?redirect_url=/invite/${token}`);
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    redirect(`/invite/${token}?error=missing-email`);
  }

  const invitation = await prisma.invitation.findUnique({
    where: {
      token,
    },
    include: {
      club: true,
      role: true,
      team: true,
    },
  });

  if (!invitation) {
    redirect(`/invite/${token}?error=not-found`);
  }

  if (invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    const status = invitation.expiresAt < new Date() && invitation.status === "PENDING" ? "EXPIRED" : invitation.status;
    if (status === "EXPIRED") {
      await prisma.invitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          status: "EXPIRED",
        },
      });
    }

    redirect(`/invite/${token}?error=invalid`);
  }

  if (invitation.email && invitation.email.toLowerCase() !== email.toLowerCase()) {
    redirect(`/invite/${token}?error=email-mismatch`);
  }

  const existingUserBeforeInvite = await prisma.user.findUnique({
    where: {
      clerkUserId: clerkUser.id,
    },
    select: {
      clubId: true,
    },
  });

  if (existingUserBeforeInvite && existingUserBeforeInvite.clubId !== invitation.clubId) {
    redirect(`/invite/${token}?error=club-mismatch`);
  }

  await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: {
        clerkUserId: clerkUser.id,
      },
    });

    const appUser =
      existingUser ??
      (await tx.user.create({
        data: {
          clubId: invitation.clubId,
          clerkUserId: clerkUser.id,
          email,
          displayName: clerkUser.fullName ?? email,
        },
      }));

    await tx.clubMembership.upsert({
      where: {
        clubId_userId_roleId: {
          clubId: invitation.clubId,
          userId: appUser.id,
          roleId: invitation.roleId,
        },
      },
      create: {
        clubId: invitation.clubId,
        userId: appUser.id,
        roleId: invitation.roleId,
      },
      update: {
        status: "ACTIVE",
      },
    });

    if (invitation.teamId) {
      await tx.teamMembership.upsert({
        where: {
          teamId_userId_roleId: {
            teamId: invitation.teamId,
            userId: appUser.id,
            roleId: invitation.roleId,
          },
        },
        create: {
          teamId: invitation.teamId,
          userId: appUser.id,
          roleId: invitation.roleId,
        },
        update: {
          status: "ACTIVE",
        },
      });
    }

    await tx.invitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        status: "ACCEPTED",
      },
    });
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function createPlayerProfile(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const playerRole = await prisma.role.findUniqueOrThrow({
    where: {
      clubId_key: {
        clubId: context.club.id,
        key: "player",
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    const player = await tx.playerProfile.create({
      data: {
        clubId: context.club.id,
        firstName: readRequiredString(formData, "firstName"),
        lastName: readRequiredString(formData, "lastName"),
        birthDate: readDate(formData, "birthDate"),
        position: readRequiredString(formData, "position"),
      },
    });

    await tx.teamMembership.create({
      data: {
        teamId: activeTeam.id,
        playerProfileId: player.id,
        roleId: playerRole.id,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/kader");
  redirect("/kader");
}

export async function updatePlayerProfile(formData: FormData) {
  const context = await requireAppContext();
  const playerId = readRequiredString(formData, "playerId");

  await prisma.playerProfile.update({
    where: {
      id: playerId,
      clubId: context.club.id,
    },
    data: {
      firstName: readRequiredString(formData, "firstName"),
      lastName: readRequiredString(formData, "lastName"),
      birthDate: readDate(formData, "birthDate"),
      position: readRequiredString(formData, "position"),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/kader");
  redirect(`/kader/${playerId}`);
}

export async function createCalendarEvent(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const typeValue = readString(formData, "type");
  const title = readString(formData, "title");
  const opponent = readString(formData, "opponent");
  const startsAtValue = readString(formData, "startsAt");
  const endsAtValue = readString(formData, "endsAt");

  if (!typeValue || !title || !startsAtValue || !endsAtValue) {
    redirect("/kalender/new?error=missing-fields");
  }

  const type = typeValue as CalendarEventType;
  const startsAt = new Date(startsAtValue);
  const endsAt = new Date(endsAtValue);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    redirect("/kalender/new?error=invalid-date");
  }

  if (endsAt <= startsAt) {
    redirect("/kalender/new?error=time-range");
  }

  if (type === "MATCH" && !opponent) {
    redirect("/kalender/new?error=missing-opponent");
  }

  const event = await prisma.$transaction(async (tx) => {
    const calendarEvent = await tx.calendarEvent.create({
      data: {
        teamId: activeTeam.id,
        type,
        title,
        description: readString(formData, "description") || null,
        location: readString(formData, "location") || null,
        startsAt,
        endsAt,
        createdByUserId: context.appUser.id,
      },
    });

    if (type === "MATCH") {
      await tx.match.create({
        data: {
          teamId: activeTeam.id,
          calendarEventId: calendarEvent.id,
          opponent,
          isHomeGame: readString(formData, "isHomeGame") !== "false",
        },
      });
    }

    const overlappingAvailabilities = await tx.playerAvailability.findMany({
      where: {
        startsAt: {
          lte: endsAt,
        },
        endsAt: {
          gte: startsAt,
        },
        playerProfile: {
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
          calendarEventId: calendarEvent.id,
          playerProfileId: availability.playerProfileId,
          status: "DECLINED",
          reason: availability.note || availabilityReason(availability.type),
          setByUserId: context.appUser.id,
        })),
        skipDuplicates: true,
      });
    }

    return calendarEvent;
  });

  revalidatePath("/dashboard");
  revalidatePath("/kalender");
  redirect(`/kalender/${event.id}`);
}

export async function updateEventAttendance(formData: FormData) {
  const context = await requireAppContext();
  const calendarEventId = readRequiredString(formData, "calendarEventId");
  const playerProfileId = readRequiredString(formData, "playerProfileId");
  const status = readRequiredString(formData, "status") as AttendanceStatus;
  const reason = readString(formData, "reason");

  if (status === "DECLINED" && !reason) {
    redirect(`/kalender/${calendarEventId}?error=declined-reason`);
  }

  await prisma.eventAttendance.upsert({
    where: {
      calendarEventId_playerProfileId: {
        calendarEventId,
        playerProfileId,
      },
    },
    create: {
      calendarEventId,
      playerProfileId,
      status,
      reason: reason || null,
      setByUserId: context.appUser.id,
    },
    update: {
      status,
      reason: reason || null,
      setByUserId: context.appUser.id,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/kalender");
  revalidatePath(`/kalender/${calendarEventId}`);
}

export async function createPlayerAvailability(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const playerProfileId = readRequiredString(formData, "playerProfileId");
  const type = readRequiredString(formData, "type") as AvailabilityType;
  const startsAt = readDate(formData, "startsAt");
  const endsAt = readDate(formData, "endsAt");
  const note = readString(formData, "note");

  if (endsAt < startsAt) {
    redirect("/abwesenheiten?error=time-range");
  }

  await prisma.$transaction(async (tx) => {
    await tx.playerAvailability.create({
      data: {
        playerProfileId,
        type,
        startsAt,
        endsAt,
        note: note || null,
      },
    });

    const affectedEvents = await tx.calendarEvent.findMany({
      where: {
        teamId: activeTeam.id,
        startsAt: {
          lte: endsAt,
        },
        endsAt: {
          gte: startsAt,
        },
      },
      select: {
        id: true,
      },
    });

    if (affectedEvents.length > 0) {
      await tx.eventAttendance.createMany({
        data: affectedEvents.map((event) => ({
          calendarEventId: event.id,
          playerProfileId,
          status: "DECLINED",
          reason: note || availabilityReason(type),
          setByUserId: context.appUser.id,
        })),
        skipDuplicates: true,
      });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/kalender");
  revalidatePath("/abwesenheiten");
  redirect("/abwesenheiten");
}

export async function createInitialMatchStats(matchId: string, playerProfileId: string) {
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
      lineupStatus: LineupStatus.NOT_USED,
    },
    update: {},
  });
}

export async function updateMatchResult(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const matchId = readRequiredString(formData, "matchId");
  const goalsFor = readOptionalInt(formData, "goalsFor");
  const goalsAgainst = readOptionalInt(formData, "goalsAgainst");
  const status = readString(formData, "status") || "PLANNED";

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
      status: status as "PLANNED" | "LIVE" | "FINISHED" | "CANCELLED",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/spiele");
  revalidatePath(`/spiele/${matchId}`);
  void context;
}

export async function updatePlayerMatchStat(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const matchId = readRequiredString(formData, "matchId");
  const playerProfileId = readRequiredString(formData, "playerProfileId");
  const lineupStatus = readString(formData, "lineupStatus") as LineupStatus;
  const goals = readInt(formData, "goals", 0);
  const assists = readInt(formData, "assists", 0);
  const yellowCards = readInt(formData, "yellowCards", 0);
  const redCards = readInt(formData, "redCards", 0);
  const minutesPlayed = readInt(formData, "minutesPlayed", 0);
  const rating = readOptionalFloat(formData, "rating");

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

  revalidatePath("/dashboard");
  revalidatePath("/spiele");
  revalidatePath(`/spiele/${matchId}`);
  void context;
}

export async function updatePlayerTrainingPerformance(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const calendarEventId = readRequiredString(formData, "calendarEventId");
  const playerProfileId = readRequiredString(formData, "playerProfileId");
  const rating = readOptionalFloat(formData, "rating");
  const note = readString(formData, "note");

  const event = await prisma.calendarEvent.findFirst({
    where: {
      id: calendarEventId,
      teamId: activeTeam.id,
      type: CalendarEventType.TRAINING,
    },
    select: {
      id: true,
    },
  });

  if (!event || rating === null || rating < 1 || rating > 10) {
    redirect(`/kalender/${calendarEventId}?error=training-rating`);
  }

  await prisma.playerTrainingPerformance.upsert({
    where: {
      calendarEventId_playerProfileId: {
        calendarEventId,
        playerProfileId,
      },
    },
    create: {
      calendarEventId,
      playerProfileId,
      rating,
      note: note || null,
      createdByUserId: context.appUser.id,
    },
    update: {
      rating,
      note: note || null,
      createdByUserId: context.appUser.id,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/kalender");
  revalidatePath(`/kalender/${calendarEventId}`);
  revalidatePath("/statistiken");
}

export async function createPlayerFileEntry(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const playerProfileId = readRequiredString(formData, "playerProfileId");
  const type = readRequiredString(formData, "type") as PlayerFileEntryType;
  const title = readRequiredString(formData, "title");
  const body = readRequiredString(formData, "body");
  const occurredAt = readDate(formData, "occurredAt");
  const followUpAt = readOptionalDate(formData, "followUpAt");

  await ensurePlayerInActiveTeam(playerProfileId, activeTeam.id, context.club.id);

  await prisma.playerFileEntry.create({
    data: {
      playerProfileId,
      teamId: activeTeam.id,
      type,
      title,
      body,
      occurredAt,
      followUpAt,
      season: activeTeam.season,
      createdByUserId: context.appUser.id,
      updatedByUserId: context.appUser.id,
    },
  });

  revalidatePath(`/kader/${playerProfileId}`);
  redirect(`/kader/${playerProfileId}`);
}

export async function createPlayerAttributeSnapshot(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const playerProfileId = readRequiredString(formData, "playerProfileId");
  const title = readRequiredString(formData, "title");
  const ratedAt = readDate(formData, "ratedAt");
  const notes = readString(formData, "notes");

  await ensurePlayerInActiveTeam(playerProfileId, activeTeam.id, context.club.id);

  const definitions = await prisma.playerAttributeDefinition.findMany({
    where: {
      clubId: context.club.id,
    },
    select: {
      id: true,
    },
  });
  const ratings = definitions
    .map((definition) => ({
      attributeDefinitionId: definition.id,
      value: readOptionalInt(formData, `attribute-${definition.id}`),
    }))
    .filter((rating): rating is { attributeDefinitionId: string; value: number } => rating.value !== null);

  if (ratings.length === 0 || ratings.some((rating) => rating.value < 1 || rating.value > 20)) {
    redirect(`/kader/${playerProfileId}?error=attribute-values`);
  }

  await prisma.playerAttributeSnapshot.create({
    data: {
      playerProfileId,
      teamId: activeTeam.id,
      season: activeTeam.season,
      title,
      ratedAt,
      notes: notes || null,
      createdByUserId: context.appUser.id,
      ratings: {
        createMany: {
          data: ratings,
        },
      },
    },
  });

  revalidatePath(`/kader/${playerProfileId}`);
  revalidatePath("/statistiken");
  redirect(`/kader/${playerProfileId}`);
}

export async function createTrainingExercise(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const visibility = readRequiredString(formData, "visibility") as TrainingExerciseVisibility;
  const exercise = await prisma.trainingExercise.create({
    data: {
      clubId: context.club.id,
      teamId: visibility === "TEAM" ? activeTeam.id : null,
      createdByUserId: context.appUser.id,
      title: readRequiredString(formData, "title"),
      description: readString(formData, "description") || null,
      objective: readString(formData, "objective") || null,
      organization: readString(formData, "organization") || null,
      flow: readString(formData, "flow") || null,
      coachingPoints: readString(formData, "coachingPoints") || null,
      variations: readString(formData, "variations") || null,
      material: readString(formData, "material") || null,
      category: readRequiredString(formData, "category") as TrainingExerciseCategory,
      durationMinutes: readOptionalInt(formData, "durationMinutes"),
      minPlayers: readOptionalInt(formData, "minPlayers"),
      maxPlayers: readOptionalInt(formData, "maxPlayers"),
      intensity: readString(formData, "intensity") ? (readString(formData, "intensity") as TrainingIntensity) : null,
      visibility,
      pitchType: readRequiredString(formData, "pitchType") as TrainingPitchType,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/training");
  redirect(`/training/${exercise.id}`);
}

export async function updateTrainingExercise(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const exerciseId = readRequiredString(formData, "exerciseId");
  const visibility = readRequiredString(formData, "visibility") as TrainingExerciseVisibility;

  await ensureTrainingExerciseAccess(exerciseId, context.club.id, activeTeam.id);

  await prisma.trainingExercise.update({
    where: {
      id: exerciseId,
      clubId: context.club.id,
    },
    data: {
      teamId: visibility === "TEAM" ? activeTeam.id : null,
      title: readRequiredString(formData, "title"),
      description: readString(formData, "description") || null,
      objective: readString(formData, "objective") || null,
      organization: readString(formData, "organization") || null,
      flow: readString(formData, "flow") || null,
      coachingPoints: readString(formData, "coachingPoints") || null,
      variations: readString(formData, "variations") || null,
      material: readString(formData, "material") || null,
      category: readRequiredString(formData, "category") as TrainingExerciseCategory,
      durationMinutes: readOptionalInt(formData, "durationMinutes"),
      minPlayers: readOptionalInt(formData, "minPlayers"),
      maxPlayers: readOptionalInt(formData, "maxPlayers"),
      intensity: readString(formData, "intensity") ? (readString(formData, "intensity") as TrainingIntensity) : null,
      visibility,
      pitchType: readRequiredString(formData, "pitchType") as TrainingPitchType,
    },
  });

  revalidatePath("/training");
  revalidatePath(`/training/${exerciseId}`);
  redirect(`/training/${exerciseId}`);
}

export async function duplicateTrainingExercise(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const exerciseId = readRequiredString(formData, "exerciseId");

  const exercise = await prisma.trainingExercise.findFirst({
    where: {
      id: exerciseId,
      clubId: context.club.id,
      OR: [{ teamId: activeTeam.id }, { teamId: null }],
    },
  });

  if (!exercise) {
    redirect("/training");
  }

  const duplicate = await prisma.trainingExercise.create({
    data: {
      clubId: context.club.id,
      teamId: exercise.teamId,
      createdByUserId: context.appUser.id,
      title: `${exercise.title} Kopie`,
      description: exercise.description,
      objective: exercise.objective,
      organization: exercise.organization,
      flow: exercise.flow,
      coachingPoints: exercise.coachingPoints,
      variations: exercise.variations,
      material: exercise.material,
      category: exercise.category,
      durationMinutes: exercise.durationMinutes,
      minPlayers: exercise.minPlayers,
      maxPlayers: exercise.maxPlayers,
      intensity: exercise.intensity,
      visibility: exercise.visibility,
      pitchType: exercise.pitchType,
      ...(exercise.sketchData ? { sketchData: exercise.sketchData as Prisma.InputJsonValue } : {}),
    },
  });

  const sketches = await prisma.trainingExerciseSketch.findMany({
    where: {
      trainingExerciseId: exercise.id,
    },
    orderBy: {
      sortOrder: "asc",
    },
  });

  if (sketches.length > 0) {
    await prisma.trainingExerciseSketch.createMany({
      data: sketches.map((sketch) => ({
        trainingExerciseId: duplicate.id,
        title: sketch.title,
        pitchType: sketch.pitchType,
        sortOrder: sketch.sortOrder,
        ...(sketch.sketchData ? { sketchData: sketch.sketchData as Prisma.InputJsonValue } : {}),
      })),
    });
  }

  revalidatePath("/training");
  redirect(`/training/${duplicate.id}`);
}

export async function createTrainingExerciseSketch(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const exerciseId = readRequiredString(formData, "exerciseId");
  const title = readString(formData, "title") || "Neue Skizze";

  await ensureTrainingExerciseAccess(exerciseId, context.club.id, activeTeam.id);

  const existingSketches = await prisma.trainingExerciseSketch.findMany({
    where: {
      trainingExerciseId: exerciseId,
    },
    select: {
      sortOrder: true,
    },
  });
  const nextSortOrder =
    existingSketches.length > 0 ? Math.max(...existingSketches.map((sketch) => sketch.sortOrder)) + 1 : 0;

  const sketch = await prisma.trainingExerciseSketch.create({
    data: {
      trainingExerciseId: exerciseId,
      title,
      sortOrder: nextSortOrder,
      pitchType: readString(formData, "pitchType")
        ? (readString(formData, "pitchType") as TrainingPitchType)
        : TrainingPitchType.FREE_AREA,
      sketchData: {
        pitch: readString(formData, "pitchType") || TrainingPitchType.FREE_AREA,
        elements: [],
      },
    },
  });

  revalidatePath("/training");
  revalidatePath(`/training/${exerciseId}`);
  revalidatePath(`/training/${exerciseId}/skizze`);
  redirect(`/training/${exerciseId}/skizze?sketchId=${sketch.id}`);
}

export async function deleteTrainingExerciseSketch(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const exerciseId = readRequiredString(formData, "exerciseId");
  const sketchId = readRequiredString(formData, "sketchId");

  await ensureTrainingExerciseAccess(exerciseId, context.club.id, activeTeam.id);

  await prisma.trainingExerciseSketch.delete({
    where: {
      id: sketchId,
      trainingExerciseId: exerciseId,
    },
  });
  const remainingSketches = await prisma.trainingExerciseSketch.count({
    where: {
      trainingExerciseId: exerciseId,
    },
  });

  if (remainingSketches === 0) {
    await prisma.trainingExercise.update({
      where: {
        id: exerciseId,
        clubId: context.club.id,
      },
      data: {
        sketchData: Prisma.JsonNull,
      },
    });
  }

  revalidatePath("/training");
  revalidatePath(`/training/${exerciseId}`);
  revalidatePath(`/training/${exerciseId}/skizze`);
  redirect(`/training/${exerciseId}/skizze`);
}

export async function upsertTrainingPlan(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const calendarEventId = readRequiredString(formData, "calendarEventId");
  const objective = readString(formData, "objective");
  const notes = readString(formData, "notes");

  await ensureTrainingEventAccess(calendarEventId, activeTeam.id);

  await prisma.trainingPlan.upsert({
    where: {
      calendarEventId,
    },
    create: {
      calendarEventId,
      objective: objective || null,
      notes: notes || null,
    },
    update: {
      objective: objective || null,
      notes: notes || null,
    },
  });

  revalidatePath("/kalender");
  revalidatePath(`/kalender/${calendarEventId}`);
  redirect(`/kalender/${calendarEventId}`);
}

export async function addExerciseToTrainingPlan(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const calendarEventId = readRequiredString(formData, "calendarEventId");
  const trainingExerciseId = readRequiredString(formData, "trainingExerciseId");
  const durationMinutes = readOptionalInt(formData, "durationMinutes");
  const coachingPoints = readString(formData, "coachingPoints");

  await ensureTrainingEventAccess(calendarEventId, activeTeam.id);
  await ensureTrainingExerciseAccess(trainingExerciseId, context.club.id, activeTeam.id);

  const plan = await prisma.trainingPlan.upsert({
    where: {
      calendarEventId,
    },
    create: {
      calendarEventId,
    },
    update: {},
    include: {
      exercises: {
        select: {
          sortOrder: true,
        },
      },
    },
  });
  const nextSortOrder =
    plan.exercises.length > 0 ? Math.max(...plan.exercises.map((exercise) => exercise.sortOrder)) + 1 : 0;

  await prisma.trainingPlanExercise.create({
    data: {
      trainingPlanId: plan.id,
      trainingExerciseId,
      sortOrder: nextSortOrder,
      durationMinutes,
      coachingPoints: coachingPoints || null,
    },
  });

  revalidatePath("/kalender");
  revalidatePath(`/kalender/${calendarEventId}`);
  redirect(`/kalender/${calendarEventId}`);
}

export async function updateTrainingExerciseSketch(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const exerciseId = readRequiredString(formData, "exerciseId");
  const sketchId = readString(formData, "sketchId");
  const title = readString(formData, "title") || "Skizze";
  const pitchType = readRequiredString(formData, "pitchType") as TrainingPitchType;
  const sketchDataValue = readRequiredString(formData, "sketchData");

  await ensureTrainingExerciseAccess(exerciseId, context.club.id, activeTeam.id);

  let sketchData: unknown;

  try {
    sketchData = JSON.parse(sketchDataValue);
  } catch {
    redirect(`/training/${exerciseId}/skizze?error=invalid-sketch`);
  }

  if (sketchId) {
    await prisma.trainingExerciseSketch.update({
      where: {
        id: sketchId,
        trainingExerciseId: exerciseId,
      },
      data: {
        title,
        pitchType,
        sketchData: sketchData as Prisma.InputJsonValue,
      },
    });
  } else {
    const sketch = await prisma.trainingExerciseSketch.create({
      data: {
        trainingExerciseId: exerciseId,
        title,
        pitchType,
        sketchData: sketchData as Prisma.InputJsonValue,
        sortOrder: 0,
      },
    });

    await prisma.trainingExercise.update({
      where: {
        id: exerciseId,
        clubId: context.club.id,
      },
      data: {
        pitchType,
        sketchData: sketchData as Prisma.InputJsonValue,
      },
    });

    revalidatePath("/training");
    revalidatePath(`/training/${exerciseId}`);
    revalidatePath(`/training/${exerciseId}/skizze`);
    redirect(`/training/${exerciseId}/skizze?sketchId=${sketch.id}`);
  }

  revalidatePath("/training");
  revalidatePath(`/training/${exerciseId}`);
  revalidatePath(`/training/${exerciseId}/skizze`);
  redirect(`/training/${exerciseId}/skizze?sketchId=${sketchId}`);
}

function readInt(formData: FormData, key: string, fallback: number) {
  const value = readString(formData, key);

  if (!value) {
    return fallback;
  }

  const number = Number.parseInt(value, 10);

  return Number.isNaN(number) ? fallback : number;
}

function readOptionalInt(formData: FormData, key: string) {
  const value = readString(formData, key);

  if (!value) {
    return null;
  }

  const number = Number.parseInt(value, 10);

  return Number.isNaN(number) ? null : number;
}

function readOptionalFloat(formData: FormData, key: string) {
  const value = readString(formData, key).replace(",", ".");

  if (!value) {
    return null;
  }

  const number = Number.parseFloat(value);

  return Number.isNaN(number) ? null : number;
}

function readOptionalDate(formData: FormData, key: string) {
  const value = readString(formData, key);

  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

async function ensurePlayerInActiveTeam(playerProfileId: string, teamId: string, clubId: string) {
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

async function ensureTrainingExerciseAccess(exerciseId: string, clubId: string, teamId: string) {
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

async function ensureTrainingEventAccess(calendarEventId: string, teamId: string) {
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

function availabilityReason(type: AvailabilityType) {
  switch (type) {
    case "VACATION":
      return "Urlaub";
    case "INJURY":
      return "Verletzung";
    case "ILLNESS":
      return "Krankheit";
    default:
      return "Abwesenheit";
  }
}
