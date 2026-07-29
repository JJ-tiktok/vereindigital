"use server";

import { ScoutingEventType, ScoutingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hasPermission, requireActiveTeam, requireAppContext, requirePermission } from "@/lib/app-context";
import { mapPositionToGroup } from "@/lib/player-development";
import { prisma } from "@/lib/prisma";
import { permissionDefinitions } from "@/lib/rbac";

import {
  parseForm,
  zDate,
  zOptionalDate,
  zOptionalInt,
  zOptionalString,
  zRequiredString,
  type ActionState,
} from "./helpers";

const SCOUTING_PERMISSION_KEYS: string[] = ["scouting.read", "scouting.manage"];
const SCOUTING_GRANTED_ROLE_KEYS = ["admin", "trainer", "assistant_coach"];

export async function ensureScoutingPermissions(clubId: string) {
  const existingPermissions = await prisma.permission.findMany({
    where: {
      key: { in: SCOUTING_PERMISSION_KEYS },
    },
  });
  const missingKeys = SCOUTING_PERMISSION_KEYS.filter(
    (key) => !existingPermissions.some((permission) => permission.key === key),
  );

  if (missingKeys.length > 0) {
    await prisma.permission.createMany({
      data: missingKeys.map((key) => {
        const definition = permissionDefinitions.find(([definitionKey]) => definitionKey === key);
        return { key, description: definition?.[1] ?? key };
      }),
      skipDuplicates: true,
    });
  }

  const permissions = await prisma.permission.findMany({
    where: {
      key: { in: SCOUTING_PERMISSION_KEYS },
    },
  });

  const roles = await prisma.role.findMany({
    where: {
      clubId,
      key: { in: SCOUTING_GRANTED_ROLE_KEYS },
    },
    include: {
      rolePermissions: true,
    },
  });

  for (const role of roles) {
    const grantedPermissionIds = new Set(role.rolePermissions.map((rolePermission) => rolePermission.permissionId));
    const toGrant = permissions.filter((permission) => !grantedPermissionIds.has(permission.id));

    if (toGrant.length > 0) {
      await prisma.rolePermission.createMany({
        data: toGrant.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
        skipDuplicates: true,
      });
    }
  }
}

function revalidateScouting(prospectId?: string) {
  revalidatePath("/scouting");

  if (prospectId) {
    revalidatePath(`/scouting/${prospectId}`);
  }
}

const scoutingProspectSchema = z.object({
  firstName: zRequiredString,
  lastName: zRequiredString,
  birthDate: zOptionalDate,
  position: zOptionalString,
  currentClub: zOptionalString,
  phone: zOptionalString,
  email: zOptionalString,
  source: zOptionalString,
  interestLevel: zOptionalInt,
  notes: zOptionalString,
});

export async function createScoutingProspect(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireAppContext();

  if (!hasPermission(context, "scouting.manage", context.activeTeam?.id)) {
    return { error: "Keine Berechtigung, Scouting-Prospects anzulegen." };
  }

  const parsed = parseForm(formData, scoutingProspectSchema);

  if (!parsed.success) {
    return parsed.state;
  }

  const prospect = await prisma.scoutingProspect.create({
    data: {
      clubId: context.club.id,
      createdByUserId: context.appUser.id,
      ...parsed.data,
    },
  });

  revalidateScouting();
  redirect(`/scouting/${prospect.id}`);
}

export async function updateScoutingProspect(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireAppContext();
  const prospectId = String(formData.get("prospectId") ?? "");

  if (!hasPermission(context, "scouting.manage", context.activeTeam?.id)) {
    return { error: "Keine Berechtigung, diesen Prospect zu bearbeiten." };
  }

  const prospect = await prisma.scoutingProspect.findFirst({
    where: {
      id: prospectId,
      clubId: context.club.id,
    },
    select: {
      id: true,
    },
  });

  if (!prospect) {
    return { error: "Prospect nicht gefunden." };
  }

  const parsed = parseForm(formData, scoutingProspectSchema);

  if (!parsed.success) {
    return parsed.state;
  }

  await prisma.scoutingProspect.update({
    where: {
      id: prospect.id,
    },
    data: parsed.data,
  });

  revalidateScouting(prospect.id);
  redirect(`/scouting/${prospect.id}`);
}

export async function updateScoutingProspectStatus(formData: FormData) {
  const context = await requireAppContext();
  requirePermission(context, "scouting.manage", context.activeTeam?.id);

  const parsed = parseForm(
    formData,
    z.object({
      prospectId: zRequiredString,
      status: z.enum(ScoutingStatus),
    }),
  );

  if (!parsed.success) {
    redirect("/scouting");
  }

  const { prospectId, status } = parsed.data;

  await prisma.scoutingProspect.updateMany({
    where: {
      id: prospectId,
      clubId: context.club.id,
    },
    data: {
      status,
    },
  });

  revalidateScouting(prospectId);
  redirect(`/scouting/${prospectId}`);
}

export async function createScoutingEvent(formData: FormData) {
  const context = await requireAppContext();
  requirePermission(context, "scouting.manage", context.activeTeam?.id);

  const parsed = parseForm(
    formData,
    z.object({
      prospectId: zRequiredString,
      type: z.enum(ScoutingEventType),
      title: zRequiredString,
      body: zRequiredString,
      occurredAt: zDate,
      followUpAt: zOptionalDate,
    }),
  );

  if (!parsed.success) {
    redirect("/scouting");
  }

  const { prospectId, type, title, body, occurredAt, followUpAt } = parsed.data;

  const prospect = await prisma.scoutingProspect.findFirst({
    where: {
      id: prospectId,
      clubId: context.club.id,
    },
    select: {
      id: true,
    },
  });

  if (!prospect) {
    redirect("/scouting");
  }

  await prisma.scoutingEvent.create({
    data: {
      prospectId: prospect.id,
      type,
      title,
      body,
      occurredAt,
      followUpAt,
      createdByUserId: context.appUser.id,
      updatedByUserId: context.appUser.id,
    },
  });

  revalidateScouting(prospect.id);
  redirect(`/scouting/${prospect.id}`);
}

export async function createScoutingAttributeSnapshot(formData: FormData) {
  const context = await requireAppContext();
  requirePermission(context, "scouting.manage", context.activeTeam?.id);

  const parsed = parseForm(
    formData,
    z.object({
      prospectId: zRequiredString,
      title: zRequiredString,
      ratedAt: zDate,
      notes: zOptionalString,
    }),
  );

  if (!parsed.success) {
    redirect("/scouting");
  }

  const { prospectId, title, ratedAt, notes } = parsed.data;

  const prospect = await prisma.scoutingProspect.findFirst({
    where: {
      id: prospectId,
      clubId: context.club.id,
    },
    select: {
      id: true,
      position: true,
    },
  });

  if (!prospect) {
    redirect("/scouting");
  }

  const positionGroup = mapPositionToGroup(prospect.position);

  const definitions = await prisma.playerAttributeDefinition.findMany({
    where: {
      clubId: context.club.id,
      positionGroup: {
        in: ["ALL", positionGroup],
      },
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
    redirect(`/scouting/${prospectId}?error=attribute-values`);
  }

  await prisma.scoutingAttributeSnapshot.create({
    data: {
      prospectId: prospect.id,
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

  revalidateScouting(prospect.id);
  redirect(`/scouting/${prospect.id}`);
}

export async function convertScoutingProspectToPlayer(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "scouting.manage", activeTeam.id);

  const prospectId = String(formData.get("prospectId") ?? "");

  const prospect = await prisma.scoutingProspect.findFirst({
    where: {
      id: prospectId,
      clubId: context.club.id,
    },
  });

  if (!prospect || prospect.convertedPlayerProfileId) {
    redirect(`/scouting/${prospectId}`);
  }

  const playerRole = await prisma.role.findUniqueOrThrow({
    where: {
      clubId_key: {
        clubId: context.club.id,
        key: "player",
      },
    },
  });

  const player = await prisma.$transaction(async (tx) => {
    const created = await tx.playerProfile.create({
      data: {
        clubId: context.club.id,
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        birthDate: prospect.birthDate,
        position: prospect.position,
      },
    });

    await tx.teamMembership.create({
      data: {
        teamId: activeTeam.id,
        playerProfileId: created.id,
        roleId: playerRole.id,
      },
    });

    await tx.scoutingProspect.update({
      where: {
        id: prospect.id,
      },
      data: {
        status: ScoutingStatus.SIGNED,
        convertedPlayerProfileId: created.id,
      },
    });

    return created;
  });

  revalidateScouting(prospect.id);
  revalidatePath("/kader");
  redirect(`/kader/${player.id}`);
}
