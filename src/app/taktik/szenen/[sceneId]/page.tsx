import { Presentation } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell, Breadcrumbs } from "@/components/app-shell";
import { PlayerTabs } from "@/components/player-tabs";
import { SceneCanvasPanel, SceneEditorProvider, SceneToolPanel } from "@/app/taktik/szenen/[sceneId]/scene-editor";
import { ScenePreview } from "@/app/taktik/szenen/[sceneId]/scene-preview";
import { StepStrip } from "@/app/taktik/szenen/[sceneId]/step-strip";
import { deleteTacticScene, duplicateTacticScene, updateTacticSceneMeta } from "@/lib/actions";
import { requireActiveTeam, requireAppContext, requirePermission } from "@/lib/app-context";
import { tacticSceneCategoryLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

const categoryOptions = ["STANDARDS", "DEFENSE", "ATTACK", "MATCH_SCENE", "CUSTOM"] as const;
const pitchOptions = ["FULL_FIELD", "HALF_FIELD", "PENALTY_AREA", "SMALL_FIELD", "FREE_AREA"] as const;

export default async function TacticScenePage({
  params,
  searchParams,
}: {
  params: Promise<{ sceneId: string }>;
  searchParams: Promise<{ stepId?: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "tactics.read", activeTeam.id);
  const { sceneId } = await params;
  const query = await searchParams;

  const scene = await prisma.tacticScene.findFirst({
    where: { id: sceneId, teamId: activeTeam.id },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });

  if (!scene) {
    notFound();
  }

  const activeStep = (query.stepId && scene.steps.find((step) => step.id === query.stepId)) || scene.steps[0] || null;

  return (
    <AppShell context={context} activePath="/taktik/szenen">
      <Breadcrumbs items={[{ label: "Taktik", href: "/taktik" }, { label: "Szenen", href: "/taktik/szenen" }, { label: scene.title }]} />
      <div className="grid gap-6 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <Link
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-strong"
            href={`/taktik/szenen/${scene.id}/praesentation`}
          >
            <Presentation className="size-4" aria-hidden="true" />
            Praesentieren
          </Link>

          <form action={updateTacticSceneMeta} className="rounded-lg border border-border bg-surface p-5">
            <input name="sceneId" type="hidden" value={scene.id} />
            <label className="block text-sm font-semibold text-foreground" htmlFor="title">
              Titel
              <input className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" defaultValue={scene.title} id="title" name="title" />
            </label>
            <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor="category">
              Kategorie
              <select className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" defaultValue={scene.category} id="category" name="category">
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {tacticSceneCategoryLabel(option)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor="pitchType">
              Feld
              <select className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" defaultValue={scene.pitchType} id="pitchType" name="pitchType">
                {pitchOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor="description">
              Beschreibung
              <textarea
                className="mt-2 min-h-20 w-full rounded-lg border border-border px-3 py-2 text-sm"
                defaultValue={scene.description ?? ""}
                id="description"
                name="description"
                placeholder="Kurze Notiz zur Szene"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor="defaultStepDurationMs">
              Tempo pro Schritt (ms)
              <input
                className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm"
                defaultValue={scene.defaultStepDurationMs}
                id="defaultStepDurationMs"
                min={300}
                name="defaultStepDurationMs"
                step={100}
                type="number"
              />
            </label>
            <button className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white" type="submit">
              Details speichern
            </button>
          </form>

          <form action={duplicateTacticScene}>
            <input name="sceneId" type="hidden" value={scene.id} />
            <button className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition hover:border-primary" type="submit">
              Als neue Szene speichern
            </button>
          </form>

          <form action={deleteTacticScene}>
            <input name="sceneId" type="hidden" value={scene.id} />
            <button className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-danger-soft px-4 text-sm font-semibold text-danger" type="submit">
              Szene loeschen
            </button>
          </form>
        </aside>

        <div className="space-y-4">
          <PlayerTabs
            tabs={[
              {
                id: "bearbeiten",
                label: "Bearbeiten",
                content: (
                  <div className="space-y-4">
                    <StepStrip
                      activeStepId={activeStep?.id ?? ""}
                      sceneId={scene.id}
                      steps={scene.steps.map((step) => ({ id: step.id, label: step.label }))}
                    />
                    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
                      <SceneEditorProvider
                        initialElements={(activeStep?.elementsData as unknown[]) ?? []}
                        initialPitch={scene.pitchType}
                        key={activeStep?.id ?? "empty"}
                        sceneId={scene.id}
                        stepId={activeStep?.id ?? null}
                      >
                        <SceneToolPanel />
                        <SceneCanvasPanel />
                      </SceneEditorProvider>
                    </div>
                  </div>
                ),
              },
              {
                id: "vorschau",
                label: `Vorschau (${scene.steps.length} Schritt${scene.steps.length === 1 ? "" : "e"})`,
                content: (
                  <ScenePreview defaultTransitionMs={scene.defaultStepDurationMs} pitch={scene.pitchType} steps={scene.steps.map((step) => step.elementsData as unknown[])} />
                ),
              },
            ]}
          />
        </div>
      </div>
    </AppShell>
  );
}
