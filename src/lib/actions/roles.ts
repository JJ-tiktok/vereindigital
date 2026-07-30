"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAppContext, requirePermission } from "@/lib/app-context";
import { permissionKeys } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createSlug } from "@/lib/slug";

import { parseForm, zRequiredString, type ActionState } from "./helpers";

function revalidateRoles() {
  revalidatePath("/rollen");
}

const createRoleSchema = z.object({
  name: zRequiredString,
});

export async function createRole(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireAppContext();
  requirePermission(context, "roles.manage");

  const parsed = parseForm(formData, createRoleSchema);

  if (!parsed.success) {
    return parsed.state;
  }

  const baseKey = createSlug(parsed.data.name) || "rolle";
  let key = baseKey;
  let suffix = 1;

  while (
    await prisma.role.findUnique({
      where: {
        clubId_key: {
          clubId: context.club.id,
          key,
        },
      },
      select: {
        id: true,
      },
    })
  ) {
    suffix += 1;
    key = `${baseKey}-${suffix}`;
  }

  await prisma.role.create({
    data: {
      clubId: context.club.id,
      key,
      name: parsed.data.name,
      isSystemRole: false,
    },
  });

  revalidateRoles();
  redirect("/rollen");
}

export async function updateRolePermissions(formData: FormData) {
  const context = await requireAppContext();
  requirePermission(context, "roles.manage");

  const roleId = String(formData.get("roleId") ?? "");
  const role = await prisma.role.findFirst({
    where: {
      id: roleId,
      clubId: context.club.id,
    },
    select: {
      id: true,
    },
  });

  if (!role) {
    redirect("/rollen");
  }

  const selectedKeys = permissionKeys.filter((key) => formData.get(`permission-${key}`) === "on");

  const permissions = await prisma.permission.findMany({
    where: {
      key: {
        in: selectedKeys,
      },
    },
    select: {
      id: true,
    },
  });

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
      },
    }),
    prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
    }),
  ]);

  revalidateRoles();
  redirect("/rollen");
}

export async function updateAllRolePermissions(formData: FormData) {
  const context = await requireAppContext();
  requirePermission(context, "roles.manage");

  const roleIds = formData.getAll("bulkRoleId").map((value) => String(value));

  const roles = await prisma.role.findMany({
    where: {
      id: { in: roleIds },
      clubId: context.club.id,
    },
    select: { id: true },
  });

  if (roles.length === 0) {
    redirect("/rollen");
  }

  const allPermissions = await prisma.permission.findMany({
    select: { id: true, key: true },
  });
  const permissionIdByKey = new Map(allPermissions.map((permission) => [permission.key, permission.id]));

  await prisma.$transaction(
    roles.flatMap((role) => {
      const selectedKeys = permissionKeys.filter((key) => formData.get(`permission-${key}-${role.id}`) === "on");
      const permissionIds = selectedKeys
        .map((key) => permissionIdByKey.get(key))
        .filter((id): id is string => Boolean(id));

      return [
        prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
        prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        }),
      ];
    }),
  );

  revalidateRoles();
  redirect("/rollen");
}

export async function deleteRole(formData: FormData) {
  const context = await requireAppContext();
  requirePermission(context, "roles.manage");

  const roleId = String(formData.get("roleId") ?? "");
  const role = await prisma.role.findFirst({
    where: {
      id: roleId,
      clubId: context.club.id,
    },
    select: {
      id: true,
      isSystemRole: true,
      _count: {
        select: {
          clubMemberships: true,
          memberships: true,
          invitations: true,
        },
      },
    },
  });

  if (!role) {
    redirect("/rollen");
  }

  if (role.isSystemRole) {
    redirect("/rollen?error=system-role");
  }

  const inUse = role._count.clubMemberships + role._count.memberships + role._count.invitations > 0;

  if (inUse) {
    redirect("/rollen?error=role-in-use");
  }

  await prisma.role.delete({
    where: {
      id: role.id,
    },
  });

  revalidateRoles();
  redirect("/rollen");
}
