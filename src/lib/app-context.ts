import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

export async function requireAppContext() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  const appUser = await prisma.user.findUnique({
    where: {
      clerkUserId: clerkUser.id,
    },
    include: {
      club: true,
      clubMemberships: {
        include: {
          role: true,
        },
      },
      memberships: {
        include: {
          role: true,
          team: true,
          playerProfile: true,
        },
      },
    },
  });

  if (!appUser) {
    redirect("/onboarding");
  }

  const isClubAdmin = appUser.clubMemberships.some(
    (membership) => membership.status === "ACTIVE" && membership.role.key === "admin",
  );

  const teams = isClubAdmin
    ? await prisma.team.findMany({
        where: {
          clubId: appUser.clubId,
        },
        orderBy: [{ name: "asc" }],
      })
    : appUser.memberships
        .filter((membership) => membership.status === "ACTIVE")
        .map((membership) => membership.team);

  return {
    clerkUser,
    appUser,
    club: appUser.club,
    isClubAdmin,
    teams,
    activeTeam: teams[0] ?? null,
  };
}

export type AppContext = Awaited<ReturnType<typeof requireAppContext>>;

export function requireActiveTeam(context: AppContext) {
  if (!context.activeTeam) {
    redirect("/dashboard?empty=team");
  }

  return context.activeTeam;
}

export function requireCoachingStaffTeam(context: AppContext, teamId: string) {
  if (context.isClubAdmin) {
    return;
  }

  const canAccess = context.appUser.memberships.some(
    (membership) =>
      membership.status === "ACTIVE" &&
      membership.teamId === teamId &&
      ["trainer", "assistant_coach"].includes(membership.role.key),
  );

  if (!canAccess) {
    redirect("/dashboard");
  }
}
