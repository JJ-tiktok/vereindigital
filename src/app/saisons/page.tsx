import { Check, Plus } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { createSeason, setActiveSeason } from "@/lib/actions";
import { requireAppContext } from "@/lib/app-context";
import { formatDate, toDateInputValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getDefaultSeasonWindow } from "@/lib/seasons";

type SeasonTeam = {
  id: string;
  name: string;
};

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
        <p className="mt-6 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {errorMessage(params.error)}
        </p>
      ) : null}

      <section className="grid gap-6 py-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {seasons.map((season) => (
            <article className="rounded-lg border border-border bg-white p-5" key={season.id}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-950">{season.name}</h2>
                    {season.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <Check className="size-3" aria-hidden="true" />
                        Aktiv
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {formatDate(season.startsAt)} bis {formatDate(season.endsAt)}
                  </p>
                </div>

                {context.isClubAdmin && !season.isActive ? (
                  <form action={setActiveSeason}>
                    <input name="seasonId" type="hidden" value={season.id} />
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-slate-800 transition hover:border-primary hover:text-primary"
                      type="submit"
                    >
                      Aktiv setzen
                    </button>
                  </form>
                ) : null}
              </div>

              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Teams in dieser Saison</p>
                {season.teams.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {season.teams.map((team: SeasonTeam) => (
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700" key={team.id}>
                        {team.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted">
                    Noch keine Teams in dieser Saison. Die spaetere Saisonuebernahme wird hier neue Team-Saison-Kader erzeugen.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>

        <aside className="space-y-6">
          {context.isClubAdmin ? (
            <form action={createSeason} className="rounded-lg border border-border bg-white p-5">
              <div className="flex items-center gap-2">
                <Plus className="size-5 text-primary" aria-hidden="true" />
                <h2 className="text-xl font-bold text-slate-950">Neue Saison</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                Erstellt eine neue Spielzeit. Teams werden im naechsten Schritt separat uebernommen oder angelegt.
              </p>

              <label className="mt-5 block text-sm font-semibold text-slate-800" htmlFor="name">
                Name
              </label>
              <input
                className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
                defaultValue={defaults.name}
                id="name"
                name="name"
                required
              />

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <label className="text-sm font-semibold text-slate-800" htmlFor="startsAt">
                    Start
                  </label>
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
                    defaultValue={toDateInputValue(defaults.startsAt)}
                    id="startsAt"
                    name="startsAt"
                    required
                    type="date"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-800" htmlFor="endsAt">
                    Ende
                  </label>
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
                    defaultValue={toDateInputValue(defaults.endsAt)}
                    id="endsAt"
                    name="endsAt"
                    required
                    type="date"
                  />
                </div>
              </div>

              <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-slate-800">
                <input className="size-4 accent-blue-600" name="activate" type="checkbox" />
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

          <article className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-xl font-bold text-slate-950">Warum Saisons?</h2>
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
    default:
      return "Bitte pruefe deine Eingaben.";
  }
}
