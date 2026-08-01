import { notFound } from "next/navigation";

import { ScenePresentation } from "@/app/taktik/szenen/[sceneId]/praesentation/scene-presentation";
import { requireActiveTeam, requireAppContext, requirePermission } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

export default async function TacticScenePresentationPage({
  params,
}: {
  params: Promise<{ sceneId: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "tactics.read", activeTeam.id);
  const { sceneId } = await params;

  const scene = await prisma.tacticScene.findFirst({
    where: { id: sceneId, teamId: activeTeam.id },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });

  if (!scene || scene.steps.length === 0) {
    notFound();
  }

  return (
    <ScenePresentation
      defaultTransitionMs={scene.defaultStepDurationMs}
      pitch={scene.pitchType}
      sceneId={scene.id}
      steps={scene.steps.map((step) => step.elementsData as unknown[])}
      title={scene.title}
    />
  );
}
