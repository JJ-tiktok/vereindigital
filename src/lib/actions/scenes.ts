"use server";

import { Prisma, TacticSceneCategory, TrainingPitchType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveTeam, requireAppContext, requirePermission } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

function revalidateScenes(sceneId?: string) {
  revalidatePath("/taktik");
  revalidatePath("/taktik/szenen");

  if (sceneId) {
    revalidatePath(`/taktik/szenen/${sceneId}`);
  }
}

export async function createTacticScene(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "tactics.manage", activeTeam.id);

  const title = String(formData.get("title") ?? "").trim() || "Neue Szene";
  const categoryValue = String(formData.get("category") ?? "").trim();
  const pitchTypeValue = String(formData.get("pitchType") ?? "").trim();
  const category = categoryValue in TacticSceneCategory ? (categoryValue as TacticSceneCategory) : TacticSceneCategory.CUSTOM;
  const pitchType = pitchTypeValue in TrainingPitchType ? (pitchTypeValue as TrainingPitchType) : TrainingPitchType.FULL_FIELD;

  const scene = await prisma.tacticScene.create({
    data: {
      clubId: context.club.id,
      teamId: activeTeam.id,
      title,
      category,
      pitchType,
      createdByUserId: context.appUser.id,
      steps: {
        create: {
          sortOrder: 0,
          elementsData: [],
        },
      },
    },
  });

  revalidateScenes(scene.id);
  redirect(`/taktik/szenen/${scene.id}`);
}

export async function updateTacticSceneMeta(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "tactics.manage", activeTeam.id);

  const sceneId = String(formData.get("sceneId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || "Neue Szene";
  const categoryValue = String(formData.get("category") ?? "").trim();
  const pitchTypeValue = String(formData.get("pitchType") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = categoryValue in TacticSceneCategory ? (categoryValue as TacticSceneCategory) : TacticSceneCategory.CUSTOM;
  const pitchType = pitchTypeValue in TrainingPitchType ? (pitchTypeValue as TrainingPitchType) : TrainingPitchType.FULL_FIELD;
  const parsedDuration = Number.parseInt(String(formData.get("defaultStepDurationMs") ?? ""), 10);
  const defaultStepDurationMs = Number.isFinite(parsedDuration) && parsedDuration >= 300 ? parsedDuration : 1500;

  if (!sceneId) {
    redirect("/taktik/szenen");
  }

  await prisma.tacticScene.update({
    where: {
      id: sceneId,
      clubId: context.club.id,
      teamId: activeTeam.id,
    },
    data: {
      title,
      category,
      pitchType,
      description: description || null,
      defaultStepDurationMs,
    },
  });

  revalidateScenes(sceneId);
  redirect(`/taktik/szenen/${sceneId}`);
}

export async function saveTacticSceneStep(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "tactics.manage", activeTeam.id);

  const sceneId = String(formData.get("sceneId") ?? "").trim();
  const stepId = String(formData.get("stepId") ?? "").trim();
  const elementsDataValue = String(formData.get("elementsData") ?? "");

  if (!sceneId) {
    redirect("/taktik/szenen");
  }

  const scene = await prisma.tacticScene.findFirst({
    where: {
      id: sceneId,
      clubId: context.club.id,
      teamId: activeTeam.id,
    },
    select: { id: true },
  });

  if (!scene) {
    redirect("/taktik/szenen");
  }

  let elementsData: unknown;

  try {
    elementsData = elementsDataValue ? JSON.parse(elementsDataValue) : [];
  } catch {
    redirect(`/taktik/szenen/${sceneId}?error=invalid-scene-data`);
  }

  let savedStepId = stepId;

  if (stepId) {
    await prisma.tacticSceneStep.update({
      where: {
        id: stepId,
        tacticSceneId: sceneId,
      },
      data: {
        elementsData: elementsData as Prisma.InputJsonValue,
      },
    });
  } else {
    const lastStep = await prisma.tacticSceneStep.findFirst({
      where: { tacticSceneId: sceneId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const created = await prisma.tacticSceneStep.create({
      data: {
        tacticSceneId: sceneId,
        sortOrder: (lastStep?.sortOrder ?? -1) + 1,
        elementsData: elementsData as Prisma.InputJsonValue,
      },
    });
    savedStepId = created.id;
  }

  revalidateScenes(sceneId);
  redirect(`/taktik/szenen/${sceneId}?stepId=${savedStepId}`);
}

export async function duplicateTacticSceneStep(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "tactics.manage", activeTeam.id);

  const sceneId = String(formData.get("sceneId") ?? "").trim();
  const stepId = String(formData.get("stepId") ?? "").trim();

  if (!sceneId || !stepId) {
    redirect("/taktik/szenen");
  }

  const scene = await prisma.tacticScene.findFirst({
    where: { id: sceneId, clubId: context.club.id, teamId: activeTeam.id },
    select: { id: true },
  });

  if (!scene) {
    redirect("/taktik/szenen");
  }

  const sourceStep = await prisma.tacticSceneStep.findFirst({
    where: { id: stepId, tacticSceneId: sceneId },
  });

  if (!sourceStep) {
    redirect(`/taktik/szenen/${sceneId}`);
  }

  const newStep = await prisma.$transaction(async (tx) => {
    await tx.tacticSceneStep.updateMany({
      where: { tacticSceneId: sceneId, sortOrder: { gt: sourceStep.sortOrder } },
      data: { sortOrder: { increment: 1 } },
    });
    return tx.tacticSceneStep.create({
      data: {
        tacticSceneId: sceneId,
        sortOrder: sourceStep.sortOrder + 1,
        label: sourceStep.label,
        elementsData: sourceStep.elementsData as Prisma.InputJsonValue,
        transitionMs: sourceStep.transitionMs,
      },
    });
  });

  revalidateScenes(sceneId);
  redirect(`/taktik/szenen/${sceneId}?stepId=${newStep.id}`);
}

export async function deleteTacticSceneStep(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "tactics.manage", activeTeam.id);

  const sceneId = String(formData.get("sceneId") ?? "").trim();
  const stepId = String(formData.get("stepId") ?? "").trim();

  if (!sceneId || !stepId) {
    redirect("/taktik/szenen");
  }

  const scene = await prisma.tacticScene.findFirst({
    where: { id: sceneId, clubId: context.club.id, teamId: activeTeam.id },
    select: {
      id: true,
      steps: { orderBy: { sortOrder: "asc" }, select: { id: true, sortOrder: true } },
    },
  });

  if (!scene) {
    redirect("/taktik/szenen");
  }

  // A scene always needs at least one step - refuse to delete the last remaining one instead
  // of leaving an empty, unplayable scene behind.
  if (scene.steps.length <= 1) {
    redirect(`/taktik/szenen/${sceneId}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.tacticSceneStep.delete({ where: { id: stepId, tacticSceneId: sceneId } });

    const remaining = scene.steps.filter((step) => step.id !== stepId);
    await Promise.all(
      remaining.map((step, index) =>
        step.sortOrder === index
          ? Promise.resolve()
          : tx.tacticSceneStep.update({ where: { id: step.id }, data: { sortOrder: index } }),
      ),
    );
  });

  revalidateScenes(sceneId);
  redirect(`/taktik/szenen/${sceneId}`);
}

export async function reorderTacticSceneSteps(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "tactics.manage", activeTeam.id);

  const sceneId = String(formData.get("sceneId") ?? "").trim();
  const stepIds = formData.getAll("stepId").map((value) => String(value));

  if (!sceneId || stepIds.length === 0) {
    redirect("/taktik/szenen");
  }

  const scene = await prisma.tacticScene.findFirst({
    where: { id: sceneId, clubId: context.club.id, teamId: activeTeam.id },
    select: { steps: { select: { id: true } } },
  });

  if (!scene) {
    redirect("/taktik/szenen");
  }

  const validIds = new Set(scene.steps.map((step) => step.id));
  const orderedIds = stepIds.filter((stepId) => validIds.has(stepId));

  // The (tacticSceneId, sortOrder) unique constraint means swapping two steps' positions
  // directly would collide mid-transaction (e.g. step A moving to the slot step B still
  // occupies). Stage everyone at unique negative positions first, then assign the real target
  // order - both passes run inside one transaction so the intermediate state is never visible.
  await prisma.$transaction([
    ...orderedIds.map((stepId, index) =>
      prisma.tacticSceneStep.update({ where: { id: stepId, tacticSceneId: sceneId }, data: { sortOrder: -(index + 1) } }),
    ),
    ...orderedIds.map((stepId, index) =>
      prisma.tacticSceneStep.update({ where: { id: stepId, tacticSceneId: sceneId }, data: { sortOrder: index } }),
    ),
  ]);

  revalidateScenes(sceneId);
  redirect(`/taktik/szenen/${sceneId}`);
}

export async function duplicateTacticScene(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "tactics.manage", activeTeam.id);

  const sceneId = String(formData.get("sceneId") ?? "").trim();

  if (!sceneId) {
    redirect("/taktik/szenen");
  }

  const source = await prisma.tacticScene.findFirst({
    where: { id: sceneId, clubId: context.club.id, teamId: activeTeam.id },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });

  if (!source) {
    redirect("/taktik/szenen");
  }

  const duplicate = await prisma.tacticScene.create({
    data: {
      clubId: context.club.id,
      teamId: activeTeam.id,
      title: `${source.title} (Kopie)`,
      category: source.category,
      pitchType: source.pitchType,
      description: source.description,
      defaultStepDurationMs: source.defaultStepDurationMs,
      createdByUserId: context.appUser.id,
      steps: {
        create: source.steps.map((step) => ({
          sortOrder: step.sortOrder,
          label: step.label,
          elementsData: step.elementsData as Prisma.InputJsonValue,
          transitionMs: step.transitionMs,
        })),
      },
    },
  });

  revalidateScenes(duplicate.id);
  redirect(`/taktik/szenen/${duplicate.id}`);
}

export async function deleteTacticScene(formData: FormData) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "tactics.manage", activeTeam.id);

  const sceneId = String(formData.get("sceneId") ?? "").trim();

  await prisma.tacticScene.deleteMany({
    where: {
      id: sceneId,
      clubId: context.club.id,
      teamId: activeTeam.id,
    },
  });

  revalidateScenes();
  redirect("/taktik/szenen");
}
