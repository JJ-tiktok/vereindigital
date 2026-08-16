import Link from "next/link";

import { AppShell, Breadcrumbs, EmptyState } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";
import { createTacticScene } from "@/lib/actions";
import { requireActiveTeam, requireAppContext, requirePermission } from "@/lib/app-context";
import { tacticSceneCategoryLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

const categoryOptions = ["STANDARDS", "DEFENSE", "ATTACK", "MATCH_SCENE", "CUSTOM"] as const;

export default async function TacticScenesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const context = await requireAppContext();
  const activeTeam = requireActiveTeam(context);
  requirePermission(context, "tactics.read", activeTeam.id);
  const query = await searchParams;
  const activeCategory = query.category && categoryOptions.includes(query.category as (typeof categoryOptions)[number]) ? query.category : null;

  const scenes = await prisma.tacticScene.findMany({
    where: {
      teamId: activeTeam.id,
      ...(activeCategory ? { category: activeCategory as (typeof categoryOptions)[number] } : {}),
    },
    select: { id: true, title: true, category: true, description: true, _count: { select: { steps: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AppShell context={context} activePath="/taktik/szenen">
      <Breadcrumbs items={[{ label: "Taktik", href: "/taktik" }, { label: "Szenen" }]} />
      <div className="space-y-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Analysemodul</p>
            <h1 className="mt-1 text-3xl font-bold text-foreground">Szenen-Bibliothek</h1>
          </div>
          <form action={createTacticScene} className="flex flex-wrap items-center gap-2">
            <input className="h-10 rounded-lg border border-border px-3 text-sm" name="title" placeholder="Titel der Szene" required />
            <select className="h-10 rounded-lg border border-border px-3 text-sm" defaultValue="CUSTOM" name="category">
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {tacticSceneCategoryLabel(option)}
                </option>
              ))}
            </select>
            <SubmitButton
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              pendingLabel="Wird angelegt..."
            >
              Neue Szene
            </SubmitButton>
          </form>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              !activeCategory ? "bg-primary text-white" : "bg-surface-muted text-foreground hover:bg-surface"
            }`}
            href="/taktik/szenen"
          >
            Alle
          </Link>
          {categoryOptions.map((option) => (
            <Link
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                activeCategory === option ? "bg-primary text-white" : "bg-surface-muted text-foreground hover:bg-surface"
              }`}
              href={`/taktik/szenen?category=${option}`}
              key={option}
            >
              {tacticSceneCategoryLabel(option)}
            </Link>
          ))}
        </div>

        {scenes.length > 0 ? (
          activeCategory ? (
            <SceneGrid scenes={scenes} />
          ) : (
            <div className="space-y-8">
              {categoryOptions
                .map((option) => ({ option, sceneList: scenes.filter((scene) => scene.category === option) }))
                .filter(({ sceneList }) => sceneList.length > 0)
                .map(({ option, sceneList }) => (
                  <section key={option}>
                    <h2 className="mb-3 text-lg font-bold text-foreground">{tacticSceneCategoryLabel(option)}</h2>
                    <SceneGrid scenes={sceneList} />
                  </section>
                ))}
            </div>
          )
        ) : (
          <EmptyState
            title="Noch keine Szenen in dieser Kategorie"
            description="Lege oben eine neue Szene an, um Standards, Defensiv- oder Offensiv-Konzepte animiert darzustellen."
          />
        )}
      </div>
    </AppShell>
  );
}

type SceneCard = { id: string; title: string; category: string; description: string | null; _count: { steps: number } };

function SceneGrid({ scenes }: { scenes: SceneCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {scenes.map((scene) => (
        <Link className="rounded-lg border border-border bg-surface p-5 transition hover:border-primary hover:shadow-sm" href={`/taktik/szenen/${scene.id}`} key={scene.id}>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">{tacticSceneCategoryLabel(scene.category)}</p>
          <h3 className="mt-2 text-lg font-bold text-foreground">{scene.title}</h3>
          <p className="mt-2 text-sm text-muted">{scene.description || "Keine Beschreibung."}</p>
          <p className="mt-3 text-xs font-semibold text-muted">
            {scene._count.steps} Schritt{scene._count.steps === 1 ? "" : "e"}
          </p>
        </Link>
      ))}
    </div>
  );
}
