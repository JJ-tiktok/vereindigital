"use server";

import { AttendanceStatus, CalendarEventType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hasPermission, requireActiveTeam, requireAppContext } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

import { availabilityReason, parseForm, zDate, zOptionalString, zRequiredString, type ActionState } from "./helpers";

function revalidateCalendar(eventId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/kalender");

  if (eventId) {
    revalidatePath(`/kalender/${eventId}`);
  }
}

const createEventSchema = z
  .object({
    type: z.enum(CalendarEventType),
    title: zRequiredString,
    description: zOptionalString,
    location: zOptionalString,
    opponent: zOptionalString,
    isHomeGame: zOptionalString,
    startsAt: zDate,
    endsAt: zDate,
  })
  .check((ctx) => {
    if (ctx.value.endsAt <= ctx.value.startsAt) {
      ctx.issues.push({
        code: "custom",
        message: "Das Ende muss nach dem Beginn liegen.",
        path: ["endsAt"],
        input: ctx.value.endsAt,
      });
    }

    if (ctx.value.type === "MATCH" && !ctx.value.opponent) {
      ctx.issues.push({
        code: "custom",
        message: "Fuer ein Spiel wird ein Gegner benoetigt.",
        path: ["opponent"],
        input: ctx.value.opponent,
      });
    }
  });

export async function createCalendarEvent(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);

  if (!hasPermission(context, "calendar.events.manage", activeTeam.id)) {
    return { error: "Keine Berechtigung, Termine zu erstellen." };
  }

  const parsed = parseForm(formData, createEventSchema);

  if (!parsed.success) {
    return parsed.state;
  }

  const { type, title, description, location, opponent, startsAt, endsAt } = parsed.data;

  const event = await prisma.$transaction(async (tx) => {
    const calendarEvent = await tx.calendarEvent.create({
      data: {
        teamId: activeTeam.id,
        type,
        title,
        description,
        location,
        startsAt,
        endsAt,
        createdByUserId: context.appUser.id,
      },
    });

    if (type === "MATCH") {
      await tx.match.create({
        data: {
          teamId: activeTeam.id,
          calendarEventId: calendarEvent.id,
          opponent: opponent ?? "",
          isHomeGame: parsed.data.isHomeGame !== "false",
        },
      });
    }

    const overlappingAvailabilities = await tx.playerAvailability.findMany({
      where: {
        startsAt: {
          lte: endsAt,
        },
        endsAt: {
          gte: startsAt,
        },
        playerProfile: {
          memberships: {
            some: {
              teamId: activeTeam.id,
              status: "ACTIVE",
              role: {
                key: "player",
              },
            },
          },
        },
      },
      select: {
        playerProfileId: true,
        type: true,
        note: true,
      },
    });

    if (overlappingAvailabilities.length > 0) {
      await tx.eventAttendance.createMany({
        data: overlappingAvailabilities.map((availability) => ({
          calendarEventId: calendarEvent.id,
          playerProfileId: availability.playerProfileId,
          status: "DECLINED" as const,
          reason: availability.note || availabilityReason(availability.type),
          setByUserId: context.appUser.id,
        })),
        skipDuplicates: true,
      });
    }

    return calendarEvent;
  });

  revalidateCalendar();
  redirect(`/kalender/${event.id}`);
}

export async function updateEventAttendance(formData: FormData) {
  const context = await requireAppContext();
  const calendarEventId = String(formData.get("calendarEventId") ?? "");
  const playerProfileId = String(formData.get("playerProfileId") ?? "");
  const statusValue = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!calendarEventId || !playerProfileId || !(statusValue in AttendanceStatus)) {
    redirect("/kalender");
  }

  const status = statusValue as AttendanceStatus;

  const event = await prisma.calendarEvent.findFirst({
    where: {
      id: calendarEventId,
      team: {
        clubId: context.club.id,
      },
    },
    select: {
      id: true,
      teamId: true,
    },
  });

  if (!event) {
    redirect("/kalender");
  }

  const player = await prisma.playerProfile.findFirst({
    where: {
      id: playerProfileId,
      clubId: context.club.id,
      memberships: {
        some: {
          teamId: event.teamId,
          status: "ACTIVE",
        },
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!player) {
    redirect(`/kalender/${event.id}`);
  }

  const isSelf = player.userId === context.appUser.id;
  const allowed =
    hasPermission(context, "attendance.manage", event.teamId) ||
    (isSelf && hasPermission(context, "attendance.self.manage", event.teamId));

  if (!allowed) {
    redirect(`/kalender/${event.id}`);
  }

  if (status === "DECLINED" && !reason) {
    redirect(`/kalender/${event.id}?error=declined-reason`);
  }

  await prisma.eventAttendance.upsert({
    where: {
      calendarEventId_playerProfileId: {
        calendarEventId: event.id,
        playerProfileId: player.id,
      },
    },
    create: {
      calendarEventId: event.id,
      playerProfileId: player.id,
      status,
      reason: reason || null,
      setByUserId: context.appUser.id,
    },
    update: {
      status,
      reason: reason || null,
      setByUserId: context.appUser.id,
    },
  });

  revalidateCalendar(event.id);
}
