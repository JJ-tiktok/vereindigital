import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { defaultRoles, permissionDefinitions } from "@/lib/rbac";
import { createSlug } from "@/lib/slug";
import { prisma } from "@/lib/prisma";

export async function completeClubOnboarding(formData: FormData) {
  "use server";

  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  const clubName = String(formData.get("clubName") ?? "").trim();
  const teamName = String(formData.get("teamName") ?? "").trim();

  if (!clubName || !teamName) {
    redirect("/onboarding?error=missing-fields");
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    redirect("/onboarding?error=missing-email");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      clerkUserId: clerkUser.id,
    },
  });

  if (existingUser) {
    redirect("/dashboard");
  }

  const clubSlug = await createUniqueClubSlug(clubName);

  await prisma.$transaction(async (tx) => {
    await tx.permission.createMany({
      data: permissionDefinitions.map(([key, description]) => ({ key, description })),
      skipDuplicates: true,
    });

    const permissions = await tx.permission.findMany();
    const permissionByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));

    const club = await tx.club.create({
      data: {
        name: clubName,
        slug: clubSlug,
      },
    });

    const user = await tx.user.create({
      data: {
        clubId: club.id,
        clerkUserId: clerkUser.id,
        email,
        displayName: clerkUser.fullName ?? email,
      },
    });

    const team = await tx.team.create({
      data: {
        clubId: club.id,
        name: teamName,
      },
    });

    for (const roleDefinition of defaultRoles) {
      const role = await tx.role.create({
        data: {
          clubId: club.id,
          key: roleDefinition.key,
          name: roleDefinition.name,
          isSystemRole: true,
        },
      });

      await tx.rolePermission.createMany({
        data: roleDefinition.permissions.map((permissionKey) => {
          const permissionId = permissionByKey.get(permissionKey);

          if (!permissionId) {
            throw new Error(`Missing permission: ${permissionKey}`);
          }

          return {
            roleId: role.id,
            permissionId,
          };
        }),
      });

      if (roleDefinition.key === "admin") {
        await tx.clubMembership.create({
          data: {
            clubId: club.id,
            userId: user.id,
            roleId: role.id,
          },
        });
        await tx.teamMembership.create({
          data: {
            teamId: team.id,
            userId: user.id,
            roleId: role.id,
          },
        });
      }
    }
  });

  redirect("/dashboard");
}

async function createUniqueClubSlug(clubName: string) {
  const baseSlug = createSlug(clubName) || "verein";
  let slug = baseSlug;
  let suffix = 1;

  while (await prisma.club.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  return slug;
}
