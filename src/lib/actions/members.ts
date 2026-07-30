"use server";

import { TeamMembershipStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAppContext, requirePermission } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

function revalidateMembers() {
  revalidatePath("/mitglieder");
  revalidatePath("/dashboard");
}

function parseStatus(value: FormDataEntryValue | null): TeamMembershipStatus {
  const raw = String(value ?? "");
  return raw in TeamMembershipStatus ? (raw as TeamMembershipStatus) : "ACTIVE";
}

export async function updateClubMembershipRole(formData: FormData) {
  const context = await requireAppContext();
  requirePermission(context, "club.manage");

  const clubMembershipId = String(formData.get("clubMembershipId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  const status = parseStatus(formData.get("status"));

  const membership = await prisma.clubMembership.findFirst({
    where: {
      id: clubMembershipId,
      clubId: context.club.id,
    },
    include: {
      role: true,
    },
  });

  if (!membership) {
    redirect("/mitglieder");
  }

  const role = await prisma.role.findFirst({
    where: {
      id: roleId,
      clubId: context.club.id,
    },
  });

  if (!role) {
    redirect("/mitglieder?error=invalid-role");
  }

  const losesAdmin = membership.role.key === "admin" && (role.key !== "admin" || status !== "ACTIVE");

  if (losesAdmin) {
    const otherActiveAdmins = await prisma.clubMembership.count({
      where: {
        clubId: context.club.id,
        status: "ACTIVE",
        role: { key: "admin" },
        id: { not: membership.id },
      },
    });

    if (otherActiveAdmins === 0) {
      redirect("/mitglieder?error=last-admin");
    }
  }

  await prisma.clubMembership.update({
    where: { id: membership.id },
    data: { roleId, status },
  });

  revalidateMembers();
  redirect("/mitglieder");
}

export async function updateTeamMembershipRole(formData: FormData) {
  const context = await requireAppContext();

  const teamMembershipId = String(formData.get("teamMembershipId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  const status = parseStatus(formData.get("status"));

  const membership = await prisma.teamMembership.findFirst({
    where: {
      id: teamMembershipId,
      team: { clubId: context.club.id },
    },
    select: {
      id: true,
      teamId: true,
    },
  });

  if (!membership) {
    redirect("/mitglieder");
  }

  requirePermission(context, "team.members.manage", membership.teamId);

  const role = await prisma.role.findFirst({
    where: {
      id: roleId,
      clubId: context.club.id,
    },
  });

  if (!role) {
    redirect("/mitglieder?error=invalid-role");
  }

  await prisma.teamMembership.update({
    where: { id: membership.id },
    data: { roleId, status },
  });

  revalidateMembers();
  redirect("/mitglieder");
}
