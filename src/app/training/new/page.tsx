import { AppShell, PageHeader } from "@/components/app-shell";
import { TrainingExerciseForm } from "@/app/training/exercise-form";
import { requireActiveTeam, requireAppContext, requireCoachingStaffTeam } from "@/lib/app-context";

export default async function NewTrainingExercisePage() {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requireCoachingStaffTeam(context, activeTeam.id);

  return (
    <AppShell context={context} activePath="/training">
      <PageHeader
        eyebrow="Trainingsbibliothek"
        title="Neue Uebung"
        description="Erstelle eine wiederverwendbare Trainingsform fuer deinen Katalog."
      />
      <div className="py-6">
        <TrainingExerciseForm />
      </div>
    </AppShell>
  );
}
