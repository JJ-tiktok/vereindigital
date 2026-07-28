"use server";

import { currentUser } from "@clerk/nextjs/server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAppContext, requirePermission } from "@/lib/app-context";
import { sendInvitationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

import { parseForm, zIntWithFallback, zOptionalString, zRequiredString, type ActionState } from "./helpers";

const createInvitationSchema = z.object({
  teamId: zRequiredString,
  roleId: zRequiredString,
  email: zOptionalString,
  expiresInDays: zIntWithFallback(14),
});

export async function createInvitation(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireAppContext();
  const parsed = parseForm(formData, createInvitationSchema);

  if (!parsed.success) {
    return parsed.state;
  }

  const { teamId, roleId, email } = parsed.data;
  const expiresInDays = Math.max(parsed.data.expiresInDays, 1);

  requirePermission(context, "invitations.manage", teamId);

  const [team, role] = await Promise.all([
    prisma.team.findFirst({
      where: {
        id: teamId,
        clubId: context.club.id,
      },
      select: {
        id: true,
        name: true,
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
        name: true,
      },
    }),
  ]);

  if (!team || !role) {
    return { error: "Team oder Rolle ist ungueltig." };
  }

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const token = randomBytes(24).toString("base64url");

  await prisma.invitation.create({
    data: {
      clubId: context.club.id,
      teamId,
      roleId,
      email,
      token,
      expiresAt,
      createdByUserId: context.appUser.id,
    },
  });

  revalidatePath("/einladungen");

  let emailed = false;

  if (email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${appUrl.replace(/\/$/, "")}/invite/${token}`;
    const result = await sendInvitationEmail({
      to: email,
      clubName: context.club.name,
      teamName: team.name,
      roleName: role.name,
      inviteUrl,
      expiresAt,
    });
    emailed = result.sent;
  }

  redirect(`/einladungen?created=1${emailed ? "&emailed=1" : ""}`);
}

export async function revokeInvitation(formData: FormData) {
  const context = await requireAppContext();
  const invitationId = String(formData.get("invitationId") ?? "");

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      clubId: context.club.id,
    },
    select: {
      id: true,
      teamId: true,
    },
  });

  if (!invitation) {
    redirect("/einladungen");
  }

  requirePermission(context, "invitations.manage", invitation.teamId ?? undefined);

  await prisma.invitation.update({
    where: {
      id: invitation.id,
    },
    data: {
      status: "REVOKED",
    },
  });

  revalidatePath("/einladungen");
  redirect("/einladungen");
}

export async function acceptInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  if (!token) {
    redirect("/");
  }

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
    if (invitation.status === "PENDING" && invitation.expiresAt < new Date()) {
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

    let playerProfileId: string | null = null;

    if (invitation.role.key === "player") {
      const existingProfile = await tx.playerProfile.findFirst({
        where: {
          clubId: invitation.clubId,
          userId: appUser.id,
        },
        select: {
          id: true,
        },
      });

      if (existingProfile) {
        playerProfileId = existingProfile.id;
      } else {
        const profile = await tx.playerProfile.create({
          data: {
            clubId: invitation.clubId,
            userId: appUser.id,
            firstName: clerkUser.firstName ?? clerkUser.fullName ?? email,
            lastName: clerkUser.lastName ?? "",
          },
        });
        playerProfileId = profile.id;
      }
    }

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
          playerProfileId,
          roleId: invitation.roleId,
        },
        update: {
          status: "ACTIVE",
          ...(playerProfileId ? { playerProfileId } : {}),
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
