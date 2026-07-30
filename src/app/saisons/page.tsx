import { Plus } from "lucide-react";

import { SeasonCard } from "@/app/saisons/season-card";
import { AppShell, PageHeader } from "@/components/app-shell";
import { createSeason } from "@/lib/actions";
import { requireAppContext } from "@/lib/app-context";
import { toDateInputValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getDefaultSeasonWindow } from "@/lib/seasons";

export default async function SeasonsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [context, params] = await Promise.all([requireAppContext(), searchParams]);
  const [seasons, defaults] = await Promise.all([
    prisma.season.findMany({
      where: {
        clubId: context.club.id,
      },
      include: {
        teams: {
          orderBy: {
            name: "asc",
          },
        },
      },
      orderBy: {
        startsAt: "desc",
      },
    }),
    Promise.resolve(getDefaultSeasonWindow()),
  ]);

  return (
    <AppShell context={context} activePath="/saisons">
      <PageHeader
        eyebrow="Vereinsstruktur"
        title="Saisons"
        description="Verwalte Spielzeiten als Grundlage fuer Kader, Termine, Statistiken und spaetere Saisonuebernahmen."
      />

      {params.error ? (
        <p className="mt-6 rounded-lg bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          {errorMessage(params.error)}
        </p>
      ) : null}

      <section className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {seasons.map((season) => (
            <SeasonCard canManage={context.isClubAdmin} key={season.id} season={season} />
          ))}
        </div>

        <aside className="space-y-6">
          {context.isClubAdmin ? (
            <form action={createSeason} className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center gap-2">
                <Plus className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-xl font-bold text-foreground">Neue Saison</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                Erstellt eine neue Spielzeit. Optional kannst du Teams samt aktiver Kader aus einer bestehenden Saison
                uebernehmen.
              </p>

              <label className="mt-5 block text-sm font-semibold text-foreground" htmlFor="name">
                Name
              </label>
              <input
                className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                defaultValue={defaults.name}
                id="name"
                name="name"
                required
              />

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <label className="text-sm font-semibold text-foreground" htmlFor="startsAt">
                    Start
                  </label>
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                    defaultValue={toDateInputValue(defaults.startsAt)}
                    id="startsAt"
                    name="startsAt"
                    required
                    type="date"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground" htmlFor="endsAt">
                    Ende
                  </label>
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                    defaultValue={toDateInputValue(defaults.endsAt)}
                    id="endsAt"
                    name="endsAt"
                    required
                    type="date"
                  />
                </div>
              </div>

              <label className="mt-5 block text-sm font-semibold text-foreground" htmlFor="copyFromSeasonId">
                Teams und Kader uebernehmen aus
              </label>
              <select
                className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                defaultValue=""
                id="copyFromSeasonId"
                name="copyFromSeasonId"
              >
                <option value="">Keine Uebernahme</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name} ({season.teams.length} Teams)
                  </option>
                ))}
              </select>

              <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-foreground">
                <input className="size-4 accent-primary" name="activate" type="checkbox" />
                Direkt als aktive Saison setzen
              </label>

              <button
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-strong"
                type="submit"
              >
                Saison erstellen
              </button>
            </form>
          ) : null}

          <article className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-xl font-bold text-foreground">Warum Saisons?</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Die aktive Saison bestimmt, welche Teams, Kader, Termine und Statistiken standardmaessig angezeigt werden.
              Spielerprofile bleiben vereinsweit erhalten und koennen in neuen Saisons wieder einem Team zugeordnet werden.
            </p>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}

function errorMessage(error: string) {
  switch (error) {
    case "duplicate":
      return "Diese Saison existiert bereits.";
    case "invalid-range":
      return "Das Enddatum muss nach dem Startdatum liegen.";
    case "missing-season":
      return "Die ausgewaehlte Saison konnte nicht gefunden werden.";
    case "invalid-fields":
      return "Bitte pruefe deine Eingaben.";
    default:
      return "Bitte pruefe deine Eingaben.";
  }
}
