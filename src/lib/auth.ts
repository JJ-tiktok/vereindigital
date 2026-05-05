import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export async function getCurrentAuthContext() {
  const { userId } = await auth();

  if (!userId) {
    return {
      clerkUser: null,
      appUser: null,
    };
  }

  const [clerkUser, appUser] = await Promise.all([
    currentUser(),
    prisma.user.findUnique({
      where: {
        clerkUserId: userId,
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
    }),
  ]);

  return {
    clerkUser,
    appUser,
  };
}
