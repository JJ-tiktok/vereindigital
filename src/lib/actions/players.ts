"use server";

import { AvailabilityType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hasPermission, requireActiveTeam, requireAppContext, requirePermission } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

import { ensurePlayerInTeam } from "./guards";
import {
  availabilityReason,
  parseForm,
  zDate,
  zOptionalInt,
  zOptionalString,
  zRequiredString,
  type ActionState,
} from "./helpers";

function revalidateRoster(playerId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/kader");

  if (playerId) {
    revalidatePath(`/kader/${playerId}`);
  }
}

const playerProfileSchema = z.object({
  firstName: zRequiredString,
  lastName: zRequiredString,
  birthDate: zDate,
  position: zRequiredString,
  jerseyNumber: zOptionalInt,
});

export async function createPlayerProfile(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);

  if (!hasPermission(context, "player.profile.manage", activeTeam.id)) {
    return { error: "Keine Berechtigung, Spielerprofile anzulegen." };
  }

  const parsed = parseForm(formData, playerProfileSchema);

  if (!parsed.success) {
    return parsed.state;
  }

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
        ...parsed.data,
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

  revalidateRoster();
  redirect("/kader");
}

export async function updatePlayerProfile(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireAppContext();
  const playerId = String(formData.get("playerId") ?? "");

  const player = await prisma.playerProfile.findFirst({
    where: {
      id: playerId,
      clubId: context.club.id,
    },
    select: {
      id: true,
      userId: true,
      memberships: {
        where: {
          status: "ACTIVE",
        },
        select: {
          teamId: true,
        },
      },
    },
  });

  if (!player) {
    return { error: "Spielerprofil nicht gefunden." };
  }

  const isSelf = player.userId === context.appUser.id;
  const canManage = player.memberships.some((membership) =>
    hasPermission(context, "player.profile.manage", membership.teamId),
  );

  if (!canManage && !(isSelf && hasPermission(context, "player.profile.self.update"))) {
    return { error: "Keine Berechtigung, dieses Profil zu bearbeiten." };
  }

  const parsed = parseForm(formData, playerProfileSchema);

  if (!parsed.success) {
    return parsed.state;
  }

  await prisma.playerProfile.update({
    where: {
      id: player.id,
    },
    data: parsed.data,
  });

  revalidateRoster();
  redirect(`/kader/${player.id}`);
}

const availabilitySchema = z.object({
  playerProfileId: zRequiredString,
  type: z.enum(AvailabilityType),
  startsAt: zDate,
  endsAt: zDate,
  note: zOptionalString,
});

export async function createPlayerAvailability(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  const parsed = parseForm(formData, availabilitySchema);

  if (!parsed.success) {
    return parsed.state;
  }

  const { playerProfileId, type, startsAt, endsAt, note } = parsed.data;

  if (endsAt < startsAt) {
    return { fieldErrors: { endsAt: ["Das Ende darf nicht vor dem Beginn liegen."] } };
  }

  const player = await prisma.playerProfile.findFirst({
    where: {
      id: playerProfileId,
      clubId: context.club.id,
      memberships: {
        some: {
          teamId: activeTeam.id,
          status: "ACTIVE",
        },
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!player) {
    return { error: "Spieler gehoert nicht zum aktiven Team." };
  }

  const isSelf = player.userId === context.appUser.id;
  const allowed =
    hasPermission(context, "availability.manage", activeTeam.id) ||
    (isSelf && hasPermission(context, "availability.self.manage", activeTeam.id));

  if (!allowed) {
    return { error: "Keine Berechtigung, Abwesenheiten fuer diesen Spieler zu verwalten." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.playerAvailability.create({
      data: {
        playerProfileId: player.id,
        type,
        startsAt,
        endsAt,
        note,
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

    const reason = note || availabilityReason(type);

    for (const event of affectedEvents) {
      await tx.eventAttendance.upsert({
        where: {
          calendarEventId_playerProfileId: {
            calendarEventId: event.id,
            playerProfileId: player.id,
          },
        },
        create: {
          calendarEventId: event.id,
          playerProfileId: player.id,
          status: "DECLINED",
          reason,
          setByUserId: context.appUser.id,
        },
        update: {
          status: "DECLINED",
          reason,
          setByUserId: context.appUser.id,
        },
      });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/kalender");
  revalidatePath("/abwesenheiten");
  redirect("/abwesenheiten");
}

async function requireAvailabilityAccess(availabilityId: string) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);

  const availability = await prisma.playerAvailability.findFirst({
    where: {
      id: availabilityId,
      playerProfile: {
        clubId: context.club.id,
        memberships: {
          some: {
            teamId: activeTeam.id,
          },
        },
      },
    },
    select: {
      id: true,
      playerProfileId: true,
      playerProfile: {
        select: { userId: true },
      },
    },
  });

  if (!availability) {
    return null;
  }

  const isSelf = availability.playerProfile.userId === context.appUser.id;
  const allowed =
    hasPermission(context, "availability.manage", activeTeam.id) ||
    (isSelf && hasPermission(context, "availability.self.manage", activeTeam.id));

  return allowed ? { context, activeTeam, availability } : null;
}

const updateAvailabilitySchema = z.object({
  availabilityId: zRequiredString,
  type: z.enum(AvailabilityType),
  startsAt: zDate,
  endsAt: zDate,
  note: zOptionalString,
});

export async function updatePlayerAvailability(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(formData, updateAvailabilitySchema);

  if (!parsed.success) {
    return parsed.state;
  }

  const { availabilityId, type, startsAt, endsAt, note } = parsed.data;

  if (endsAt < startsAt) {
    return { fieldErrors: { endsAt: ["Das Ende darf nicht vor dem Beginn liegen."] } };
  }

  const access = await requireAvailabilityAccess(availabilityId);

  if (!access) {
    return { error: "Keine Berechtigung, diese Abwesenheit zu bearbeiten." };
  }

  await prisma.playerAvailability.update({
    where: { id: availabilityId },
    data: { type, startsAt, endsAt, note },
  });

  revalidatePath("/dashboard");
  revalidatePath("/abwesenheiten");
  redirect("/abwesenheiten");
}

export async function deletePlayerAvailability(formData: FormData) {
  const availabilityId = String(formData.get("availabilityId") ?? "");

  if (!availabilityId) {
    redirect("/abwesenheiten");
  }

  const access = await requireAvailabilityAccess(availabilityId);

  if (!access) {
    redirect("/abwesenheiten");
  }

  await prisma.playerAvailability.delete({ where: { id: availabilityId } });

  revalidatePath("/dashboard");
  revalidatePath("/abwesenheiten");
  redirect("/abwesenheiten");
}

export async function removePlayerFromActiveTeam(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "player.profile.manage", activeTeam.id);
  const playerId = String(formData.get("playerId") ?? "");

  await ensurePlayerInTeam(playerId, activeTeam.id, context.club.id);

  const playerRole = await prisma.role.findUniqueOrThrow({
    where: {
      clubId_key: {
        clubId: context.club.id,
        key: "player",
      },
    },
  });

  await prisma.teamMembership.updateMany({
    where: {
      playerProfileId: playerId,
      roleId: playerRole.id,
      status: "ACTIVE",
      teamId: activeTeam.id,
    },
    data: {
      status: "INACTIVE",
    },
  });

  revalidateRoster(playerId);
  revalidatePath("/kalender");
  revalidatePath("/abwesenheiten");
  redirect("/kader?removed=1");
}
