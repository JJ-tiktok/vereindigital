"use server";

import {
  Prisma,
  TrainingExerciseCategory,
  TrainingExerciseVisibility,
  TrainingIntensity,
  TrainingPitchType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hasPermission, requireActiveTeam, requireAppContext, requirePermission } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

import { ensureTrainingEventAccess, ensureTrainingExerciseAccess } from "./guards";
import { parseForm, zOptionalInt, zOptionalString, zRequiredString, type ActionState } from "./helpers";

function revalidateTraining(exerciseId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/training");

  if (exerciseId) {
    revalidatePath(`/training/${exerciseId}`);
    revalidatePath(`/training/${exerciseId}/skizze`);
  }
}

const exerciseSchema = z.object({
  title: zRequiredString,
  description: zOptionalString,
  objective: zOptionalString,
  organization: zOptionalString,
  flow: zOptionalString,
  coachingPoints: zOptionalString,
  variations: zOptionalString,
  material: zOptionalString,
  category: z.enum(TrainingExerciseCategory),
  durationMinutes: zOptionalInt,
  minPlayers: zOptionalInt,
  maxPlayers: zOptionalInt,
  intensity: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value in TrainingIntensity ? (value as TrainingIntensity) : null)),
  visibility: z.enum(TrainingExerciseVisibility),
  pitchType: z.enum(TrainingPitchType),
});

export async function createTrainingExercise(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);

  if (!hasPermission(context, "training.catalog.manage", activeTeam.id)) {
    return { error: "Keine Berechtigung, Uebungen zu erstellen." };
  }

  const parsed = parseForm(formData, exerciseSchema);

  if (!parsed.success) {
    return parsed.state;
  }

  const exercise = await prisma.trainingExercise.create({
    data: {
      clubId: context.club.id,
      teamId: parsed.data.visibility === "TEAM" ? activeTeam.id : null,
      createdByUserId: context.appUser.id,
      ...parsed.data,
    },
  });

  revalidateTraining();
  redirect(`/training/${exercise.id}`);
}

export async function updateTrainingExercise(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);

  if (!hasPermission(context, "training.catalog.manage", activeTeam.id)) {
    return { error: "Keine Berechtigung, Uebungen zu bearbeiten." };
  }

  const exerciseId = String(formData.get("exerciseId") ?? "");

  if (!exerciseId) {
    return { error: "Uebung nicht gefunden." };
  }

  const parsed = parseForm(formData, exerciseSchema);

  if (!parsed.success) {
    return parsed.state;
  }

  await ensureTrainingExerciseAccess(exerciseId, context.club.id, activeTeam.id);

  await prisma.trainingExercise.update({
    where: {
      id: exerciseId,
      clubId: context.club.id,
    },
    data: {
      teamId: parsed.data.visibility === "TEAM" ? activeTeam.id : null,
      ...parsed.data,
    },
  });

  revalidateTraining(exerciseId);
  redirect(`/training/${exerciseId}`);
}

export async function duplicateTrainingExercise(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "training.catalog.manage", activeTeam.id);
  const exerciseId = String(formData.get("exerciseId") ?? "");

  const exercise = await prisma.trainingExercise.findFirst({
    where: {
      id: exerciseId,
      clubId: context.club.id,
      OR: [{ teamId: activeTeam.id }, { teamId: null }],
    },
  });

  if (!exercise) {
    redirect("/training");
  }

  const duplicate = await prisma.trainingExercise.create({
    data: {
      clubId: context.club.id,
      teamId: exercise.teamId,
      createdByUserId: context.appUser.id,
      title: `${exercise.title} Kopie`,
      description: exercise.description,
      objective: exercise.objective,
      organization: exercise.organization,
      flow: exercise.flow,
      coachingPoints: exercise.coachingPoints,
      variations: exercise.variations,
      material: exercise.material,
      category: exercise.category,
      durationMinutes: exercise.durationMinutes,
      minPlayers: exercise.minPlayers,
      maxPlayers: exercise.maxPlayers,
      intensity: exercise.intensity,
      visibility: exercise.visibility,
      pitchType: exercise.pitchType,
      ...(exercise.sketchData ? { sketchData: exercise.sketchData as Prisma.InputJsonValue } : {}),
    },
  });

  const sketches = await prisma.trainingExerciseSketch.findMany({
    where: {
      trainingExerciseId: exercise.id,
    },
    orderBy: {
      sortOrder: "asc",
    },
  });

  if (sketches.length > 0) {
    await prisma.trainingExerciseSketch.createMany({
      data: sketches.map((sketch) => ({
        trainingExerciseId: duplicate.id,
        title: sketch.title,
        pitchType: sketch.pitchType,
        sortOrder: sketch.sortOrder,
        ...(sketch.sketchData ? { sketchData: sketch.sketchData as Prisma.InputJsonValue } : {}),
      })),
    });
  }

  revalidateTraining();
  redirect(`/training/${duplicate.id}`);
}

export async function createTrainingExerciseSketch(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "training.catalog.manage", activeTeam.id);
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const title = String(formData.get("title") ?? "").trim() || "Neue Skizze";
  const pitchTypeValue = String(formData.get("pitchType") ?? "").trim();
  const pitchType =
    pitchTypeValue in TrainingPitchType ? (pitchTypeValue as TrainingPitchType) : TrainingPitchType.FREE_AREA;

  await ensureTrainingExerciseAccess(exerciseId, context.club.id, activeTeam.id);

  const existingSketches = await prisma.trainingExerciseSketch.findMany({
    where: {
      trainingExerciseId: exerciseId,
    },
    select: {
      sortOrder: true,
    },
  });
  const nextSortOrder =
    existingSketches.length > 0 ? Math.max(...existingSketches.map((sketch) => sketch.sortOrder)) + 1 : 0;

  const sketch = await prisma.trainingExerciseSketch.create({
    data: {
      trainingExerciseId: exerciseId,
      title,
      sortOrder: nextSortOrder,
      pitchType,
      sketchData: {
        pitch: pitchType,
        elements: [],
      },
    },
  });

  revalidateTraining(exerciseId);
  redirect(`/training/${exerciseId}/skizze?sketchId=${sketch.id}`);
}

export async function deleteTrainingExerciseSketch(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "training.catalog.manage", activeTeam.id);
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const sketchId = String(formData.get("sketchId") ?? "");

  await ensureTrainingExerciseAccess(exerciseId, context.club.id, activeTeam.id);

  await prisma.trainingExerciseSketch.delete({
    where: {
      id: sketchId,
      trainingExerciseId: exerciseId,
    },
  });
  const remainingSketches = await prisma.trainingExerciseSketch.count({
    where: {
      trainingExerciseId: exerciseId,
    },
  });

  if (remainingSketches === 0) {
    await prisma.trainingExercise.update({
      where: {
        id: exerciseId,
        clubId: context.club.id,
      },
      data: {
        sketchData: Prisma.JsonNull,
      },
    });
  }

  revalidateTraining(exerciseId);
  redirect(`/training/${exerciseId}/skizze`);
}

export async function updateTrainingExerciseSketch(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "training.catalog.manage", activeTeam.id);
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const sketchId = String(formData.get("sketchId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || "Skizze";
  const pitchTypeValue = String(formData.get("pitchType") ?? "").trim();
  const sketchDataValue = String(formData.get("sketchData") ?? "");

  if (!(pitchTypeValue in TrainingPitchType) || !sketchDataValue) {
    redirect(`/training/${exerciseId}/skizze?error=invalid-sketch`);
  }

  const pitchType = pitchTypeValue as TrainingPitchType;

  await ensureTrainingExerciseAccess(exerciseId, context.club.id, activeTeam.id);

  let sketchData: unknown;

  try {
    sketchData = JSON.parse(sketchDataValue);
  } catch {
    redirect(`/training/${exerciseId}/skizze?error=invalid-sketch`);
  }

  if (sketchId) {
    await prisma.trainingExerciseSketch.update({
      where: {
        id: sketchId,
        trainingExerciseId: exerciseId,
      },
      data: {
        title,
        pitchType,
        sketchData: sketchData as Prisma.InputJsonValue,
      },
    });

    revalidateTraining(exerciseId);
    redirect(`/training/${exerciseId}/skizze?sketchId=${sketchId}`);
  }

  const sketch = await prisma.trainingExerciseSketch.create({
    data: {
      trainingExerciseId: exerciseId,
      title,
      pitchType,
      sketchData: sketchData as Prisma.InputJsonValue,
      sortOrder: 0,
    },
  });

  await prisma.trainingExercise.update({
    where: {
      id: exerciseId,
      clubId: context.club.id,
    },
    data: {
      pitchType,
      sketchData: sketchData as Prisma.InputJsonValue,
    },
  });

  revalidateTraining(exerciseId);
  redirect(`/training/${exerciseId}/skizze?sketchId=${sketch.id}`);
}

export async function upsertTrainingPlan(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "training.plan.manage", activeTeam.id);
  const calendarEventId = String(formData.get("calendarEventId") ?? "");
  const objective = String(formData.get("objective") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  await ensureTrainingEventAccess(calendarEventId, activeTeam.id);

  await prisma.trainingPlan.upsert({
    where: {
      calendarEventId,
    },
    create: {
      calendarEventId,
      objective: objective || null,
      notes: notes || null,
    },
    update: {
      objective: objective || null,
      notes: notes || null,
    },
  });

  revalidatePath("/kalender");
  revalidatePath(`/kalender/${calendarEventId}`);
  redirect(`/kalender/${calendarEventId}`);
}

export async function addExerciseToTrainingPlan(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "training.plan.manage", activeTeam.id);
  const calendarEventId = String(formData.get("calendarEventId") ?? "");
  const trainingExerciseId = String(formData.get("trainingExerciseId") ?? "");
  const durationMinutesValue = String(formData.get("durationMinutes") ?? "").trim();
  const durationMinutes = durationMinutesValue ? Number.parseInt(durationMinutesValue, 10) : null;
  const coachingPoints = String(formData.get("coachingPoints") ?? "").trim();

  await ensureTrainingEventAccess(calendarEventId, activeTeam.id);
  await ensureTrainingExerciseAccess(trainingExerciseId, context.club.id, activeTeam.id);

  const plan = await prisma.trainingPlan.upsert({
    where: {
      calendarEventId,
    },
    create: {
      calendarEventId,
    },
    update: {},
    include: {
      exercises: {
        select: {
          sortOrder: true,
        },
      },
    },
  });
  const nextSortOrder =
    plan.exercises.length > 0 ? Math.max(...plan.exercises.map((exercise) => exercise.sortOrder)) + 1 : 0;

  await prisma.trainingPlanExercise.create({
    data: {
      trainingPlanId: plan.id,
      trainingExerciseId,
      sortOrder: nextSortOrder,
      durationMinutes: durationMinutes !== null && Number.isNaN(durationMinutes) ? null : durationMinutes,
      coachingPoints: coachingPoints || null,
    },
  });

  revalidatePath("/kalender");
  revalidatePath(`/kalender/${calendarEventId}`);
  redirect(`/kalender/${calendarEventId}`);
}
