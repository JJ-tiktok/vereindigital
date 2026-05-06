import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getDefaultSeasonWindow } from "@/lib/seasons";

export type AppTeam = Prisma.TeamGetPayload<{
  include: {
    seasonRef: true;
  };
}>;

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
          team: {
            include: {
              seasonRef: true,
            },
          },
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
  const activeSeason = await ensureActiveSeason(appUser.clubId);

  const teams: AppTeam[] = isClubAdmin
    ? await prisma.team.findMany({
        where: {
          clubId: appUser.clubId,
          seasonId: activeSeason.id,
        },
        include: {
          seasonRef: true,
        },
        orderBy: [{ name: "asc" }],
      })
    : appUser.memberships
        .filter((membership) => membership.status === "ACTIVE" && membership.team.seasonId === activeSeason.id)
        .map((membership) => membership.team as AppTeam);

  return {
    clerkUser,
    appUser,
    club: appUser.club,
    activeSeason,
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

async function ensureActiveSeason(clubId: string) {
  const activeSeason = await prisma.season.findFirst({
    where: {
      clubId,
      isActive: true,
    },
    orderBy: {
      startsAt: "desc",
    },
  });

  if (activeSeason) {
    return activeSeason;
  }

  const latestSeason = await prisma.season.findFirst({
    where: {
      clubId,
    },
    orderBy: {
      startsAt: "desc",
    },
  });

  if (latestSeason) {
    return prisma.season.update({
      where: {
        id: latestSeason.id,
      },
      data: {
        isActive: true,
      },
    });
  }

  const defaultSeason = getDefaultSeasonWindow();

  return prisma.season.create({
    data: {
      clubId,
      name: defaultSeason.name,
      startsAt: defaultSeason.startsAt,
      endsAt: defaultSeason.endsAt,
      isActive: true,
    },
  });
}
