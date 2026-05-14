"use client";

import { FileText, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export type SquadRow = {
  id: string;
  name: string;
  initials: string;
  jerseyNumber: number | null;
  position: string;
  age: number;
  goals: number;
  assists: number;
  minutes: number;
  matchForm: number | null;
  trainingForm: number | null;
  fileEntries: number;
  status: {
    kind: "fit" | "injured" | "absent";
    label: string;
  };
};

const positionGroups = [
  { key: "ALL", label: "Alle", positions: [] },
  { key: "TW", label: "Tor", positions: ["TW", "GK"] },
  { key: "DEFENSE", label: "Abwehr", positions: ["IV", "AV", "LV", "RV", "CB", "LB", "RB"] },
  { key: "MIDFIELD", label: "Mittelfeld", positions: ["DM", "ZM", "OM", "CM", "CDM", "CAM", "LM", "RM"] },
  { key: "OFFENSE", label: "Offensive", positions: ["FL", "ST", "LA", "RA", "LW", "RW", "CF", "MS"] },
];

export function SquadRoster({ players }: { players: SquadRow[] }) {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("ALL");

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const group = positionGroups.find((positionGroup) => positionGroup.key === activeGroup) ?? positionGroups[0];

    return players.filter((player) => {
      const matchesPosition =
        group.key === "ALL" || group.positions.includes(player.position.toUpperCase());
      const matchesQuery =
        !normalizedQuery ||
        player.name.toLowerCase().includes(normalizedQuery) ||
        player.position.toLowerCase().includes(normalizedQuery) ||
        String(player.jerseyNumber ?? "").includes(normalizedQuery);

      return matchesPosition && matchesQuery;
    });
  }, [activeGroup, players, query]);

  return (
    <section className="min-w-0 space-y-4">
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              className="h-11 w-full rounded-lg border border-border bg-white pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Spieler, Position oder Nummer suchen..."
              type="search"
              value={query}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 lg:overflow-visible lg:pb-0">
            {positionGroups.map((group) => {
              const active = activeGroup === group.key;

              return (
                <button
                  aria-pressed={active}
                  className={`h-10 shrink-0 rounded-lg border px-3 text-sm font-semibold transition ${
                    active
                      ? "border-blue-200 bg-blue-50 text-primary"
                      : "border-border bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  key={group.key}
                  onClick={() => setActiveGroup(group.key)}
                  type="button"
                >
                  {group.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="border-b border-border bg-slate-50 px-4 py-3 sm:px-5">
          <div className="grid grid-cols-[48px_minmax(220px,1.3fr)_70px_90px_120px_160px_110px_90px] gap-4 text-xs font-semibold uppercase tracking-wide text-muted max-xl:hidden">
            <span>#</span>
            <span>Spieler</span>
            <span>Nr.</span>
            <span>Position</span>
            <span>Status</span>
            <span>Trainingsform</span>
            <span>Belastung</span>
            <span>Aktion</span>
          </div>
          <div className="xl:hidden">
            <p className="text-xs font-semibold uppercase text-muted">
              {filteredPlayers.length} von {players.length} Spielern
            </p>
          </div>
        </div>

        {filteredPlayers.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredPlayers.map((player, index) => (
              <PlayerRow index={index} key={player.id} player={player} />
            ))}
          </div>
        ) : (
          <p className="p-5 text-sm text-muted">Keine Spieler fuer diese Filter gefunden.</p>
        )}

        <div className="flex flex-col gap-3 border-t border-border px-4 py-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>
            Zeige {filteredPlayers.length} von {players.length} Eintraegen
          </span>
          <span className="font-semibold text-primary">Seite 1</span>
        </div>
      </div>
    </section>
  );
}

function PlayerRow({ index, player }: { index: number; player: SquadRow }) {
  return (
    <Link
      className={`block px-4 py-3 transition hover:bg-blue-50/60 sm:px-5 sm:py-4 ${
        player.status.kind === "injured" ? "bg-rose-50/40" : ""
      }`}
      href={`/kader/${player.id}`}
    >
      <div className="grid gap-4 xl:grid-cols-[48px_minmax(220px,1.3fr)_70px_90px_120px_160px_110px_90px] xl:items-center">
        <span className="hidden text-sm font-bold tabular-nums text-slate-700 xl:block">{index + 1}</span>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-blue-50 text-sm font-bold text-primary sm:size-11">
            {player.jerseyNumber ? player.jerseyNumber : player.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-950">{player.name}</p>
            <p className="mt-1 truncate text-sm text-muted xl:hidden">
              {player.position} / {player.age} Jahre / {player.status.label}
            </p>
            <p className="hidden text-sm text-muted xl:block">
              {player.goals} Tore / {player.assists} Vorlagen / {player.minutes} Min.
            </p>
          </div>
          <StatusBadge status={player.status} mobile />
        </div>
        <span className="hidden text-sm font-bold tabular-nums text-slate-700 xl:block">
          {player.jerseyNumber ? `#${player.jerseyNumber}` : "-"}
        </span>
        <span className="hidden w-max rounded-lg bg-slate-100 px-3 py-1 text-center text-xs font-semibold text-slate-700 xl:block">
          {player.position}
        </span>
        <StatusBadge status={player.status} />
        <TrainingFormBar value={player.trainingForm} />
        <LoadIndicator value={player.trainingForm} />
        <span className="hidden items-center gap-2 text-sm font-semibold text-primary xl:flex">
          <FileText className="size-4" aria-hidden="true" />
          Profil
        </span>
      </div>
    </Link>
  );
}

function StatusBadge({
  mobile = false,
  status,
}: {
  mobile?: boolean;
  status: SquadRow["status"];
}) {
  const classes = {
    absent: "bg-slate-100 text-slate-700",
    fit: "bg-blue-50 text-primary",
    injured: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`${mobile ? "inline-flex xl:hidden" : "hidden xl:inline-flex"} w-max shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${classes[status.kind]}`}
    >
      <span className="mr-1.5 mt-1 size-2 rounded-full bg-current" />
      {mobile ? shortStatusLabel(status.label) : status.label}
    </span>
  );
}

function TrainingFormBar({ value }: { value: number | null }) {
  const percentage = value === null ? 0 : Math.round(value * 10);

  return (
    <div className="hidden items-center gap-3 xl:flex">
      <span className="w-10 text-sm font-semibold tabular-nums text-slate-800">{value === null ? "-" : `${percentage}%`}</span>
      <div className="h-2 flex-1 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function LoadIndicator({ value }: { value: number | null }) {
  const percentage = value === null ? 0 : Math.round(value * 10);
  const label = percentage >= 85 ? "Hoch" : percentage >= 65 ? "Mittel" : percentage > 0 ? "Niedrig" : "-";
  const activeBars = percentage >= 85 ? 4 : percentage >= 65 ? 3 : percentage > 0 ? 2 : 0;

  return (
    <div className="hidden xl:block">
      <div className="flex h-5 items-end gap-1">
        {[1, 2, 3, 4].map((bar) => (
          <span
            className={`w-2 rounded-t ${bar <= activeBars ? "bg-primary" : "bg-slate-200"}`}
            key={bar}
            style={{ height: `${bar * 20}%` }}
          />
        ))}
      </div>
      <p className="mt-1 text-sm text-slate-700">{label}</p>
    </div>
  );
}

function shortStatusLabel(label: string) {
  return label === "Abwesend" ? "Abw." : label;
}
