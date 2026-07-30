"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";

import { setActiveSeason, updateSeason } from "@/lib/actions";
import { toDateInputValue } from "@/lib/format";

type SeasonTeam = { id: string; name: string };

type Season = {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  teams: SeasonTeam[];
};

export function SeasonCard({ season, canManage }: { season: Season; canManage: boolean }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        {isEditing ? (
          <form action={updateSeason} className="grid flex-1 gap-3 sm:grid-cols-3">
            <input name="seasonId" type="hidden" value={season.id} />
            <div className="sm:col-span-1">
              <label className="text-xs font-semibold uppercase text-muted" htmlFor={`name-${season.id}`}>
                Name
              </label>
              <input
                className="mt-1 h-10 w-full rounded-lg border border-border px-3 text-sm"
                defaultValue={season.name}
                id={`name-${season.id}`}
                name="name"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted" htmlFor={`startsAt-${season.id}`}>
                Start
              </label>
              <input
                className="mt-1 h-10 w-full rounded-lg border border-border px-3 text-sm"
                defaultValue={toDateInputValue(season.startsAt)}
                id={`startsAt-${season.id}`}
                name="startsAt"
                required
                type="date"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted" htmlFor={`endsAt-${season.id}`}>
                Ende
              </label>
              <input
                className="mt-1 h-10 w-full rounded-lg border border-border px-3 text-sm"
                defaultValue={toDateInputValue(season.endsAt)}
                id={`endsAt-${season.id}`}
                name="endsAt"
                required
                type="date"
              />
            </div>
            <div className="flex items-end gap-2 sm:col-span-3">
              <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white" type="submit">
                Speichern
              </button>
              <button
                className="h-10 rounded-lg border border-border px-4 text-sm font-semibold text-foreground"
                onClick={() => setIsEditing(false)}
                type="button"
              >
                Abbrechen
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground">{season.name}</h2>
              {season.isActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                  <Check className="size-3" aria-hidden="true" />
                  Aktiv
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-muted">
              {formatDate(season.startsAt)} bis {formatDate(season.endsAt)}
            </p>
          </div>
        )}

        {!isEditing && canManage ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
              onClick={() => setIsEditing(true)}
              type="button"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              Bearbeiten
            </button>
            {!season.isActive ? (
              <form action={setActiveSeason}>
                <input name="seasonId" type="hidden" value={season.id} />
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
                  type="submit"
                >
                  Aktiv setzen
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-5 rounded-lg bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Teams in dieser Saison</p>
        {season.teams.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {season.teams.map((team) => (
              <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-foreground" key={team.id}>
                {team.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Noch keine Teams in dieser Saison. Beim Anlegen einer neuen Saison kannst du Teams und Kader aus einer
            bestehenden Saison uebernehmen.
          </p>
        )}
      </div>
    </article>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}
