import { notFound } from "next/navigation";

import { TrainingExerciseForm } from "@/app/training/exercise-form";
import { AppShell, PageHeader } from "@/components/app-shell";
import { requireActiveTeam, requireAppContext, requireCoachingStaffTeam } from "@/lib/app-context";
import { prisma } from "@/lib/prisma";

export default async function EditTrainingExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);
  const { exerciseId } = await params;
  const exercise = await prisma.trainingExercise.findFirst({
    where: {
      id: exerciseId,
      clubId: context.club.id,
      OR: [{ teamId: activeTeam.id }, { teamId: null }],
    },
  });

  if (!exercise) {
    notFound();
  }

  return (
    <AppShell context={context} activePath="/training">
      <PageHeader
        eyebrow="Trainingsbibliothek"
        title="Uebung bearbeiten"
        description="Passe Aufbau, Ablauf, Coaching Points und Katalogdaten an."
      />
      <div className="py-6">
        <TrainingExerciseForm exercise={exercise} />
      </div>
    </AppShell>
  );
}
