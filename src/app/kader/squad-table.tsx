"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { SortableHeader } from "@/components/sortable-header";

export type SquadRow = {
  id: string;
  name: string;
  initials: string;
  position: string | null;
  age: number | null;
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

const statusOptions: Array<{ value: "" | SquadRow["status"]["kind"]; label: string }> = [
  { value: "", label: "Alle Status" },
  { value: "fit", label: "Fit" },
  { value: "injured", label: "Verletzt / Krank" },
  { value: "absent", label: "Abwesend" },
];

type SortKey = "name" | "position" | "status" | "trainingForm";

const statusRank: Record<SquadRow["status"]["kind"], number> = {
  fit: 0,
  injured: 1,
  absent: 2,
};

export function SquadTable({ players }: { players: SquadRow[] }) {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState<"" | SquadRow["status"]["kind"]>("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const positionOptions = useMemo(() => {
    const values = new Set<string>();
    for (const player of players) {
      if (player.position) {
        values.add(player.position);
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [players]);

  const filteredPlayers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return players.filter((player) => {
      if (term && !player.name.toLowerCase().includes(term)) {
        return false;
      }
      if (position && player.position !== position) {
        return false;
      }
      if (status && player.status.kind !== status) {
        return false;
      }
      return true;
    });
  }, [players, search, position, status]);

  const sortedPlayers = useMemo(() => {
    if (!sortKey) {
      return filteredPlayers;
    }

    const dir = sortDir === "asc" ? 1 : -1;

    return [...filteredPlayers].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "position":
          return (a.position ?? "").localeCompare(b.position ?? "") * dir;
        case "status":
          return (statusRank[a.status.kind] - statusRank[b.status.kind]) * dir;
        case "trainingForm": {
          const aValue = a.trainingForm ?? -Infinity;
          const bValue = b.trainingForm ?? -Infinity;
          return (aValue - bValue) * dir;
        }
        default:
          return 0;
      }
    });
  }, [filteredPlayers, sortKey, sortDir]);

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-border pb-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1" />
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <SearchIcon />
            <input
              className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft sm:w-72"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Spieler suchen..."
              type="search"
              value={search}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <select
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
            onChange={(event) => setPosition(event.target.value)}
            value={position}
          >
            <option value="">Alle Positionen</option>
            {positionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
            onChange={(event) => setStatus(event.target.value as typeof status)}
            value={status}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border bg-surface-muted px-5 py-3">
          <div className="grid grid-cols-[48px_minmax(240px,1.3fr)_90px_120px_160px_110px_90px] gap-4 text-xs font-semibold uppercase tracking-wide text-muted max-xl:hidden">
            <span>#</span>
            <SortableHeader label="Spieler" onClick={() => toggleSort("name")} sortDir={sortKey === "name" ? sortDir : null} />
            <SortableHeader label="Position" onClick={() => toggleSort("position")} sortDir={sortKey === "position" ? sortDir : null} />
            <SortableHeader label="Status" onClick={() => toggleSort("status")} sortDir={sortKey === "status" ? sortDir : null} />
            <SortableHeader label="Trainingsform" onClick={() => toggleSort("trainingForm")} sortDir={sortKey === "trainingForm" ? sortDir : null} />
            <span>Belastung</span>
            <span>Aktion</span>
          </div>
          <div className="xl:hidden">
            <p className="text-xs font-semibold uppercase text-muted">Kader</p>
          </div>
        </div>

        {sortedPlayers.length > 0 ? (
          <div className="divide-y divide-border">
            {sortedPlayers.map((player, index) => (
              <Link
                className={`block px-5 py-4 transition hover:bg-blue-50/60 ${
                  player.status.kind === "injured" ? "bg-rose-50/40" : ""
                }`}
                href={`/kader/${player.id}`}
                key={player.id}
              >
                <div className="grid gap-4 xl:grid-cols-[48px_minmax(240px,1.3fr)_90px_120px_160px_110px_90px] xl:items-center">
                  <span className="hidden text-sm font-bold tabular-nums text-foreground xl:block">{index + 1}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-primary-soft text-sm font-bold text-primary">
                      {player.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{player.name}</p>
                      <p className="mt-1 text-sm text-muted xl:hidden">
                        {player.position ?? "?"} / {player.age ?? "?"} Jahre / {player.status.label}
                      </p>
                      <p className="hidden text-sm text-muted xl:block">
                        {player.goals} Tore / {player.assists} Vorlagen / {player.minutes} Min.
                      </p>
                    </div>
                  </div>
                  <span className="hidden w-max rounded-lg bg-surface-muted px-3 py-1 text-center text-xs font-semibold text-foreground xl:block">
                    {player.position}
                  </span>
                  <StatusBadge status={player.status} />
                  <TrainingFormBar value={player.trainingForm} />
                  <LoadIndicator value={player.trainingForm} />
                  <span className="hidden items-center gap-2 text-sm font-semibold text-primary xl:flex">
                    <FileText className="size-4" aria-hidden="true" />
                    Profil
                  </span>
                  <div className="grid grid-cols-2 gap-3 xl:hidden">
                    <MobileStat label="Spiel" value={formatRating(player.matchForm)} />
                    <MobileStat label="Training" value={formatRating(player.trainingForm)} />
                    <MobileStat label="T / V" value={`${player.goals} / ${player.assists}`} />
                    <MobileStat label="Akte" value={player.fileEntries.toString()} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-muted">Keine Spieler gefunden. Passe die Filter an.</div>
        )}

        <div className="flex flex-col gap-3 border-t border-border px-5 py-4 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Zeige {filteredPlayers.length > 0 ? 1 : 0} bis {filteredPlayers.length} von {players.length} Eintraegen
          </span>
          <span className="font-semibold text-primary">Seite 1</span>
        </div>
      </div>
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function MobileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: SquadRow["status"] }) {
  const classes = {
    absent: "bg-surface-muted text-foreground",
    fit: "bg-primary-soft text-primary",
    injured: "bg-danger-soft text-danger",
  };

  return (
    <span className={`hidden w-max rounded-full px-3 py-1 text-xs font-semibold xl:inline-flex ${classes[status.kind]}`}>
      <span className="mr-2 mt-1 size-2 rounded-full bg-current" />
      {status.label}
    </span>
  );
}

function TrainingFormBar({ value }: { value: number | null }) {
  const percentage = value === null ? 0 : Math.round(value * 10);

  return (
    <div className="hidden items-center gap-3 xl:flex">
      <span className="w-10 text-sm font-semibold tabular-nums text-foreground">{value === null ? "-" : `${percentage}%`}</span>
      <div className="h-2 flex-1 rounded-full bg-surface-muted">
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
      <p className="mt-1 text-sm text-foreground">{label}</p>
    </div>
  );
}

function formatRating(value: number | null) {
  if (value === null) {
    return "-";
  }

  return value.toFixed(1);
}
