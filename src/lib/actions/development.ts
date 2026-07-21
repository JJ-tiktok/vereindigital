"use server";

import { CalendarEventType, PlayerFileEntryType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireActiveSeason, requireActiveTeam, requireAppContext, requirePermission } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

import { ensurePlayerInTeam } from "./guards";
import { parseForm, zDate, zOptionalDate, zOptionalFloat, zOptionalString, zRequiredString } from "./helpers";

export async function updatePlayerTrainingPerformance(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "player.profile.manage", activeTeam.id);

  const parsed = parseForm(
    formData,
    z.object({
      calendarEventId: zRequiredString,
      playerProfileId: zRequiredString,
      rating: zOptionalFloat,
      note: zOptionalString,
    }),
  );

  if (!parsed.success) {
    redirect("/kalender");
  }

  const { calendarEventId, playerProfileId, rating, note } = parsed.data;

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

  await ensurePlayerInTeam(playerProfileId, activeTeam.id, context.club.id);

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
      note,
      createdByUserId: context.appUser.id,
    },
    update: {
      rating,
      note,
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
  const activeSeason = requireActiveSeason(context);
  requirePermission(context, "player.profile.manage", activeTeam.id);

  const parsed = parseForm(
    formData,
    z.object({
      playerProfileId: zRequiredString,
      type: z.enum(PlayerFileEntryType),
      title: zRequiredString,
      body: zRequiredString,
      occurredAt: zDate,
      followUpAt: zOptionalDate,
    }),
  );

  if (!parsed.success) {
    redirect("/kader");
  }

  const { playerProfileId, type, title, body, occurredAt, followUpAt } = parsed.data;

  await ensurePlayerInTeam(playerProfileId, activeTeam.id, context.club.id);

  await prisma.playerFileEntry.create({
    data: {
      playerProfileId,
      teamId: activeTeam.id,
      type,
      title,
      body,
      occurredAt,
      followUpAt,
      season: activeSeason.name,
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
  const activeSeason = requireActiveSeason(context);
  requirePermission(context, "player.profile.manage", activeTeam.id);

  const parsed = parseForm(
    formData,
    z.object({
      playerProfileId: zRequiredString,
      title: zRequiredString,
      ratedAt: zDate,
      notes: zOptionalString,
    }),
  );

  if (!parsed.success) {
    redirect("/kader");
  }

  const { playerProfileId, title, ratedAt, notes } = parsed.data;

  await ensurePlayerInTeam(playerProfileId, activeTeam.id, context.club.id);

  const definitions = await prisma.playerAttributeDefinition.findMany({
    where: {
      clubId: context.club.id,
    },
    select: {
      id: true,
    },
  });
  const ratings = definitions
    .map((definition) => {
      const raw = String(formData.get(`attribute-${definition.id}`) ?? "").trim();
      const value = raw ? Number.parseInt(raw, 10) : Number.NaN;

      return {
        attributeDefinitionId: definition.id,
        value,
      };
    })
    .filter((rating) => !Number.isNaN(rating.value));

  if (ratings.length === 0 || ratings.some((rating) => rating.value < 1 || rating.value > 20)) {
    redirect(`/kader/${playerProfileId}?error=attribute-values`);
  }

  await prisma.playerAttributeSnapshot.create({
    data: {
      playerProfileId,
      teamId: activeTeam.id,
      season: activeSeason.name,
      title,
      ratedAt,
      notes,
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
