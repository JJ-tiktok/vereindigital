import "server-only";

import { cache } from "react";

import { auth } from "@clerk/nextjs/server";
import type { Team } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  collectPermissionKeys,
  collectTeamPermissionKeys,
  resolveActiveTeam,
  resolvePermission,
} from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import type { PermissionKey } from "@/lib/rbac";

export type AppTeam = Team;

export const ACTIVE_TEAM_COOKIE = "activeTeamId";
export const ACTIVE_CLUB_COOKIE = "activeClubId";

const membershipInclude = {
  role: {
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  },
} as const;

async function loadAppContext() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const appUser = await prisma.user.findUnique({
    where: {
      clerkUserId: userId,
    },
    include: {
      clubMemberships: {
        include: {
          ...membershipInclude,
          club: true,
        },
      },
      memberships: {
        include: {
          ...membershipInclude,
          team: true,
          playerProfile: true,
        },
      },
    },
  });

  if (!appUser) {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();

  const activeClubMemberships = appUser.clubMemberships
    .filter((membership) => membership.status === "ACTIVE")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const preferredClubId = cookieStore.get(ACTIVE_CLUB_COOKIE)?.value;
  const club =
    activeClubMemberships.find((membership) => membership.clubId === preferredClubId)?.club ??
    activeClubMemberships[0]?.club ??
    null;

  if (!club) {
    redirect("/onboarding");
  }

  const clubPermissions = collectPermissionKeys(
    activeClubMemberships.filter((membership) => membership.clubId === club.id),
  );

  const activeTeamMemberships = appUser.memberships.filter(
    (membership) => membership.status === "ACTIVE" && membership.team.clubId === club.id,
  );

  const teamPermissions = collectTeamPermissionKeys(activeTeamMemberships);

  const isClubAdmin = clubPermissions.has("club.manage");

  const clubSeasons = await prisma.season.findMany({
    where: {
      clubId: club.id,
    },
    orderBy: {
      startsAt: "desc",
    },
  });
  const activeSeason = clubSeasons.find((season) => season.isActive) ?? clubSeasons[0] ?? null;

  const teams: AppTeam[] = !activeSeason
    ? []
    : isClubAdmin
      ? await prisma.team.findMany({
          where: {
            clubId: club.id,
            seasonId: activeSeason.id,
          },
          orderBy: [{ name: "asc" }],
        })
      : activeTeamMemberships
          .filter((membership) => membership.team.seasonId === activeSeason.id)
          .map((membership) => membership.team as AppTeam)
          .filter((team, index, all) => all.findIndex((entry) => entry.id === team.id) === index)
          .sort((a, b) => a.name.localeCompare(b.name));

  const preferredTeamId = cookieStore.get(ACTIVE_TEAM_COOKIE)?.value;
  const activeTeam = resolveActiveTeam(teams, preferredTeamId);

  return {
    appUser,
    club,
    clubs: activeClubMemberships
      .map((membership) => membership.club)
      .filter((entry, index, all) => all.findIndex((candidate) => candidate.id === entry.id) === index),
    activeSeason,
    isClubAdmin,
    clubPermissions,
    teamPermissions,
    teams,
    activeTeam,
  };
}

export const requireAppContext = cache(loadAppContext);

export type AppContext = Awaited<ReturnType<typeof requireAppContext>>;

export function hasPermission(context: AppContext, key: PermissionKey, teamId?: string) {
  return resolvePermission(
    context.clubPermissions,
    context.teamPermissions,
    key,
    teamId ?? context.activeTeam?.id,
  );
}

export function requirePermission(context: AppContext, key: PermissionKey, teamId?: string) {
  if (!hasPermission(context, key, teamId)) {
    redirect("/dashboard");
  }
}

export function requireActiveTeam(context: AppContext) {
  if (!context.activeTeam) {
    redirect("/dashboard?empty=team");
  }

  return context.activeTeam;
}

export function requireActiveSeason(context: AppContext) {
  if (!context.activeSeason) {
    redirect(context.isClubAdmin ? "/saisons" : "/dashboard?empty=season");
  }

  return context.activeSeason;
}
