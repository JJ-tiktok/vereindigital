"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAppContext, requirePermission } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";
import { getDefaultSeasonWindow } from "@/lib/seasons";

import { parseForm, zDate, zOptionalString } from "./helpers";

function revalidateSeasons() {
  revalidatePath("/saisons");
  revalidatePath("/dashboard");
}

const createSeasonSchema = z.object({
  name: zOptionalString,
  startsAt: zDate,
  endsAt: zDate,
  activate: zOptionalString,
  copyFromSeasonId: zOptionalString,
});

export async function createSeason(formData: FormData) {
  const context = await requireAppContext();
  requirePermission(context, "club.manage");

  const parsed = parseForm(formData, createSeasonSchema);

  if (!parsed.success) {
    redirect("/saisons?error=invalid-fields");
  }

  const defaults = getDefaultSeasonWindow();
  const { startsAt, endsAt, copyFromSeasonId } = parsed.data;
  const name = parsed.data.name ?? defaults.name;
  const shouldActivate = parsed.data.activate === "on";

  if (endsAt <= startsAt) {
    redirect("/saisons?error=invalid-range");
  }

  const [existingSeason, sourceSeason] = await Promise.all([
    prisma.season.findUnique({
      where: {
        clubId_name: {
          clubId: context.club.id,
          name,
        },
      },
    }),
    copyFromSeasonId
      ? prisma.season.findFirst({
          where: {
            id: copyFromSeasonId,
            clubId: context.club.id,
          },
          include: {
            teams: {
              include: {
                memberships: {
                  where: {
                    status: "ACTIVE",
                  },
                },
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  if (existingSeason) {
    redirect("/saisons?error=duplicate");
  }

  if (copyFromSeasonId && !sourceSeason) {
    redirect("/saisons?error=missing-season");
  }

  await prisma.$transaction(async (tx) => {
    if (shouldActivate) {
      await tx.season.updateMany({
        where: {
          clubId: context.club.id,
        },
        data: {
          isActive: false,
        },
      });
    }

    const season = await tx.season.create({
      data: {
        clubId: context.club.id,
        name,
        startsAt,
        endsAt,
        isActive: shouldActivate,
      },
    });

    for (const sourceTeam of sourceSeason?.teams ?? []) {
      const team = await tx.team.create({
        data: {
          clubId: context.club.id,
          seasonId: season.id,
          name: sourceTeam.name,
          ageGroup: sourceTeam.ageGroup,
        },
      });

      if (sourceTeam.memberships.length > 0) {
        await tx.teamMembership.createMany({
          data: sourceTeam.memberships.map((membership) => ({
            teamId: team.id,
            userId: membership.userId,
            playerProfileId: membership.playerProfileId,
            roleId: membership.roleId,
            status: membership.status,
          })),
        });
      }
    }
  });

  revalidateSeasons();
  redirect("/saisons");
}

export async function setActiveSeason(formData: FormData) {
  const context = await requireAppContext();
  requirePermission(context, "club.manage");

  const seasonId = String(formData.get("seasonId") ?? "");
  const season = await prisma.season.findFirst({
    where: {
      id: seasonId,
      clubId: context.club.id,
    },
  });

  if (!season) {
    redirect("/saisons?error=missing-season");
  }

  await prisma.$transaction([
    prisma.season.updateMany({
      where: {
        clubId: context.club.id,
      },
      data: {
        isActive: false,
      },
    }),
    prisma.season.update({
      where: {
        id: season.id,
      },
      data: {
        isActive: true,
      },
    }),
  ]);

  revalidateSeasons();
  redirect("/saisons");
}
