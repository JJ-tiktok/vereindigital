"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTeam, requireAppContext, requirePermission, type AppContext, type AppTeam } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";
import { permissionDefinitions } from "@/lib/rbac";
import { clampSliderValue, formationOptions, persistedTacticSlotsSchema, tacticArrowsSchema } from "@/lib/tactics";

const TACTICS_PERMISSION_KEYS: string[] = ["tactics.read", "tactics.manage"];
const TACTICS_GRANTED_ROLE_KEYS = ["admin", "trainer", "assistant_coach"];

export async function ensureTacticsPermissions(clubId: string) {
  const existingPermissions = await prisma.permission.findMany({
    where: {
      key: { in: TACTICS_PERMISSION_KEYS },
    },
  });
  const missingKeys = TACTICS_PERMISSION_KEYS.filter(
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
      key: { in: TACTICS_PERMISSION_KEYS },
    },
  });

  const roles = await prisma.role.findMany({
    where: {
      clubId,
      key: { in: TACTICS_GRANTED_ROLE_KEYS },
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

async function persistTactic({
  context,
  activeTeam,
  formData,
  forceNew,
}: {
  context: AppContext;
  activeTeam: AppTeam;
  formData: FormData;
  forceNew: boolean;
}) {
  requirePermission(context, "tactics.manage", activeTeam.id);

  const existingTacticId = forceNew ? "" : String(formData.get("tacticId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || "Neue Taktik";
  const formation = String(formData.get("formation") ?? "").trim() || formationOptions[0];
  const defenseFormation = String(formData.get("defenseFormation") ?? "").trim() || formationOptions[0];
  const styleValue = clampSliderValue(Number(formData.get("styleValue") ?? 2));
  const lineValue = clampSliderValue(Number(formData.get("lineValue") ?? 2));
  const pressingValue = clampSliderValue(Number(formData.get("pressingValue") ?? 2));
  const widthValue = clampSliderValue(Number(formData.get("widthValue") ?? 2));
  const tempoValue = clampSliderValue(Number(formData.get("tempoValue") ?? 2));

  let slotsInput: unknown;
  let arrowsInput: unknown;

  try {
    slotsInput = JSON.parse(String(formData.get("slotsData") ?? "[]"));
    arrowsInput = JSON.parse(String(formData.get("arrowsData") ?? "[]"));
  } catch {
    redirect("/taktik?error=invalid-tactic");
  }

  const slotsResult = persistedTacticSlotsSchema.safeParse(slotsInput);
  const arrowsResult = tacticArrowsSchema.safeParse(arrowsInput);

  if (!slotsResult.success || !arrowsResult.success) {
    redirect("/taktik?error=invalid-tactic");
  }

  const slots = slotsResult.data;
  const arrows = arrowsResult.data;

  const tactic = await prisma.$transaction(async (tx) => {
    const savedTactic = existingTacticId
      ? await tx.tactic.update({
          where: {
            id: existingTacticId,
            clubId: context.club.id,
            teamId: activeTeam.id,
          },
          data: { name, formation, defenseFormation, styleValue, lineValue, pressingValue, widthValue, tempoValue },
        })
      : await tx.tactic.create({
          data: {
            clubId: context.club.id,
            teamId: activeTeam.id,
            name,
            formation,
            defenseFormation,
            styleValue,
            lineValue,
            pressingValue,
            widthValue,
            tempoValue,
            createdByUserId: context.appUser.id,
          },
        });

    await tx.tacticSlot.deleteMany({ where: { tacticId: savedTactic.id } });
    await tx.tacticArrow.deleteMany({ where: { tacticId: savedTactic.id } });

    if (slots.length > 0) {
      await tx.tacticSlot.createMany({
        data: slots.map((slot) => ({ tacticId: savedTactic.id, ...slot })),
      });
    }

    if (arrows.length > 0) {
      await tx.tacticArrow.createMany({
        data: arrows.map((arrow) => ({ tacticId: savedTactic.id, ...arrow })),
      });
    }

    return savedTactic;
  });

  revalidatePath("/taktik");
  redirect(`/taktik?tacticId=${tactic.id}`);
}

export async function saveTactic(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  await persistTactic({ context, activeTeam, formData, forceNew: false });
}

export async function saveTacticAsNew(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  await persistTactic({ context, activeTeam, formData, forceNew: true });
}

export async function renameTactic(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "tactics.manage", activeTeam.id);

  const tacticId = String(formData.get("tacticId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!tacticId || !name) {
    redirect("/taktik?error=invalid-tactic");
  }

  await prisma.tactic.update({
    where: {
      id: tacticId,
      clubId: context.club.id,
      teamId: activeTeam.id,
    },
    data: { name },
  });

  revalidatePath("/taktik");
  redirect(`/taktik?tacticId=${tacticId}`);
}

export async function deleteTactic(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "tactics.manage", activeTeam.id);

  const tacticId = String(formData.get("tacticId") ?? "").trim();

  await prisma.tactic.deleteMany({
    where: {
      id: tacticId,
      clubId: context.club.id,
      teamId: activeTeam.id,
    },
  });

  revalidatePath("/taktik");
  redirect("/taktik");
}
