"use server";

import { FeedbackPriority, FeedbackStatus, FeedbackType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAppContext } from "@/lib/app-context";
import { canUseFeedback, getActiveTeamRoleKeys } from "@/lib/feedback-permissions";
import { prisma } from "@/lib/prisma";

const maxScreenshotLength = 750_000;

export type FeedbackActionState = {
  message: string;
  ok: boolean;
};

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readInt(formData: FormData, key: string) {
  const value = Number.parseInt(readString(formData, key), 10);

  return Number.isNaN(value) ? null : value;
}

export async function createFeedbackItem(formData: FormData): Promise<FeedbackActionState> {
  const context = await requireAppContext();

  if (!canUseFeedback(context)) {
    return {
      message: "Feedback kann aktuell nur von Admins, Trainern und Co-Trainern gesendet werden.",
      ok: false,
    };
  }

  const type = parseFeedbackType(readString(formData, "type"));
  const priority = parseFeedbackPriority(readString(formData, "priority"));
  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const screenshot = normalizeScreenshot(readString(formData, "screenshotData"));
  const route = readString(formData, "route");
  const viewportWidth = readInt(formData, "viewportWidth");
  const viewportHeight = readInt(formData, "viewportHeight");
  const roleKeys = getActiveTeamRoleKeys(context);

  if (!title || !description) {
    return {
      message: "Bitte Titel und Beschreibung ausfuellen.",
      ok: false,
    };
  }

  await prisma.feedbackItem.create({
    data: {
      clubId: context.club.id,
      context: {
        activeSeason: context.activeSeason.name,
        activeTeamName: context.activeTeam?.name ?? null,
        clubName: context.club.name,
        roleKeys: context.isClubAdmin ? ["admin", ...roleKeys] : roleKeys,
        screenshotSkipped: Boolean(readString(formData, "screenshotSkipped")),
      } satisfies Prisma.InputJsonObject,
      createdByUserId: context.appUser.id,
      description,
      priority,
      route: route || null,
      screenshotData: screenshot,
      seasonId: context.activeSeason.id,
      teamId: context.activeTeam?.id ?? null,
      title,
      type,
      userAgent: readString(formData, "userAgent") || null,
      viewportHeight,
      viewportWidth,
    },
  });

  revalidatePath("/feedback");

  return {
    message: "Danke, dein Feedback wurde gespeichert.",
    ok: true,
  };
}

export async function updateFeedbackStatus(formData: FormData) {
  const context = await requireAppContext();

  if (!context.isClubAdmin) {
    redirect("/feedback");
  }

  const feedbackId = readString(formData, "feedbackId");
  const status = parseFeedbackStatus(readString(formData, "status"));

  await prisma.feedbackItem.update({
    where: {
      clubId: context.club.id,
      id: feedbackId,
    },
    data: {
      status,
    },
  });

  revalidatePath("/feedback");
  revalidatePath(`/feedback/${feedbackId}`);
  redirect(`/feedback/${feedbackId}`);
}

function parseFeedbackType(value: string) {
  if (Object.values(FeedbackType).includes(value as FeedbackType)) {
    return value as FeedbackType;
  }

  return FeedbackType.OTHER;
}

function parseFeedbackPriority(value: string) {
  if (Object.values(FeedbackPriority).includes(value as FeedbackPriority)) {
    return value as FeedbackPriority;
  }

  return FeedbackPriority.MEDIUM;
}

function parseFeedbackStatus(value: string) {
  if (Object.values(FeedbackStatus).includes(value as FeedbackStatus)) {
    return value as FeedbackStatus;
  }

  return FeedbackStatus.NEW;
}

function normalizeScreenshot(value: string) {
  if (!value || !value.startsWith("data:image/")) {
    return null;
  }

  return value.length > maxScreenshotLength ? null : value;
}
