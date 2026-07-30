"use client";

import { CircleDot } from "lucide-react";
import { useMemo, useState } from "react";

import { SortableHeader } from "@/components/sortable-header";

type PlayerRow = {
  assists: number;
  goals: number;
  id: string;
  initials: string;
  jerseyNumber: number | null;
  lineupStatus: string;
  minutesPlayed: number;
  name: string;
  played: boolean;
  position: string;
  rating: number | null;
  redCards: number;
  saved: boolean;
  unavailable: boolean;
  yellowCards: number;
};

type SortKey = "name" | "minutesPlayed" | "goals" | "assists" | "yellowCards" | "redCards" | "rating";

const gridCols = "lg:grid-cols-[minmax(220px,1fr)_120px_62px_52px_52px_58px_58px_70px]";

export function MatchdaySquadTable({ players }: { players: PlayerRow[] }) {
  const [statusById, setStatusById] = useState<Record<string, string>>(() =>
    Object.fromEntries(players.map((player) => [player.id, player.lineupStatus])),
  );
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

  function setStatus(playerId: string, status: string) {
    setStatusById((current) => ({ ...current, [playerId]: status }));
  }

  const usedPlayers = players.filter((player) => (statusById[player.id] ?? player.lineupStatus) !== "NOT_USED");
  const benchPlayers = players.filter((player) => (statusById[player.id] ?? player.lineupStatus) === "NOT_USED");

  const sortedUsedPlayers = useMemo(() => {
    if (!sortKey) {
      return usedPlayers;
    }

    const dir = sortDir === "asc" ? 1 : -1;

    return [...usedPlayers].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "minutesPlayed":
          return (a.minutesPlayed - b.minutesPlayed) * dir;
        case "goals":
          return (a.goals - b.goals) * dir;
        case "assists":
          return (a.assists - b.assists) * dir;
        case "yellowCards":
          return (a.yellowCards - b.yellowCards) * dir;
        case "redCards":
          return (a.redCards - b.redCards) * dir;
        case "rating": {
          const aValue = a.rating ?? -Infinity;
          const bValue = b.rating ?? -Infinity;
          return (aValue - bValue) * dir;
        }
        default:
          return 0;
      }
    });
  }, [usedPlayers, sortKey, sortDir]);

  const sortedBenchPlayers = useMemo(
    () => [...benchPlayers].sort((a, b) => a.name.localeCompare(b.name)),
    [benchPlayers],
  );

  return (
    <>
      {sortedUsedPlayers.length > 0 ? (
        <>
          <div className={`hidden gap-3 border-b border-border bg-surface-muted px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted lg:grid ${gridCols}`}>
            <SortableHeader label="Spieler" onClick={() => toggleSort("name")} sortDir={sortKey === "name" ? sortDir : null} />
            <span>Status</span>
            <SortableHeader label="Min" onClick={() => toggleSort("minutesPlayed")} sortDir={sortKey === "minutesPlayed" ? sortDir : null} />
            <SortableHeader label="T" onClick={() => toggleSort("goals")} sortDir={sortKey === "goals" ? sortDir : null} />
            <SortableHeader label="V" onClick={() => toggleSort("assists")} sortDir={sortKey === "assists" ? sortDir : null} />
            <SortableHeader label="Gelb" onClick={() => toggleSort("yellowCards")} sortDir={sortKey === "yellowCards" ? sortDir : null} />
            <SortableHeader label="Rot" onClick={() => toggleSort("redCards")} sortDir={sortKey === "redCards" ? sortDir : null} />
            <SortableHeader label="Note" onClick={() => toggleSort("rating")} sortDir={sortKey === "rating" ? sortDir : null} />
          </div>
          <div className="divide-y divide-border">
            {sortedUsedPlayers.map((player) => (
              <PlayerStatRow
                key={player.id}
                onStatusChange={(status) => setStatus(player.id, status)}
                player={player}
                status={statusById[player.id] ?? player.lineupStatus}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="p-5 text-sm text-muted">Noch niemand eingesetzt. Setze unten Spieler auf Startelf oder Einwechslung.</p>
      )}

      {sortedBenchPlayers.length > 0 ? (
        <div className="border-t border-border">
          <p className="bg-surface-muted px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted">
            Kader ohne Einsatz ({sortedBenchPlayers.length})
          </p>
          <div className="divide-y divide-border">
            {sortedBenchPlayers.map((player) => (
              <BenchRow key={player.id} onStatusChange={(status) => setStatus(player.id, status)} player={player} />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function PlayerStatRow({
  onStatusChange,
  player,
  status,
}: {
  onStatusChange: (status: string) => void;
  player: PlayerRow;
  status: string;
}) {
  return (
    <div className={`grid gap-3 p-4 transition hover:bg-surface-muted ${gridCols} lg:items-center`}>
      <input name="playerProfileId" type="hidden" value={player.id} />
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
          {player.jerseyNumber ?? player.initials}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-bold text-foreground">{player.name}</p>
            <CircleDot className="size-3 text-primary" aria-hidden="true" />
            {player.unavailable ? (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                Abwesend
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted lg:hidden">{player.position}</p>
        </div>
      </div>
      <label className="text-xs font-semibold uppercase text-muted lg:sr-only">
        Status
        <select
          className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm font-normal text-foreground"
          name={`lineupStatus-${player.id}`}
          onChange={(event) => onStatusChange(event.target.value)}
          value={status}
        >
          <option value="STARTER">Startelf</option>
          <option value="SUBSTITUTE">Einwechslung</option>
          <option value="NOT_USED">Nicht eingesetzt</option>
        </select>
      </label>
      <CompactNumber label="Min" max={120} name={`minutesPlayed-${player.id}`} value={player.minutesPlayed} />
      <CompactNumber label="T" name={`goals-${player.id}`} value={player.goals} />
      <CompactNumber label="V" name={`assists-${player.id}`} value={player.assists} />
      <CompactNumber accent={player.yellowCards > 0 ? "yellow" : undefined} label="Gelb" name={`yellowCards-${player.id}`} value={player.yellowCards} />
      <CompactNumber accent={player.redCards > 0 ? "red" : undefined} label="Rot" name={`redCards-${player.id}`} value={player.redCards} />
      <CompactNumber label="Note" max={10} name={`rating-${player.id}`} step="0.1" value={player.rating ?? undefined} />
    </div>
  );
}

function BenchRow({
  onStatusChange,
  player,
}: {
  onStatusChange: (status: string) => void;
  player: PlayerRow;
}) {
  return (
    <div className="flex items-center gap-3 p-3">
      <input name="playerProfileId" type="hidden" value={player.id} />
      <input name={`lineupStatus-${player.id}`} type="hidden" value="NOT_USED" />
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-muted">
        {player.jerseyNumber ?? player.initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{player.name}</p>
        <p className="text-xs text-muted">{player.position}</p>
      </div>
      {player.unavailable ? (
        <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
          Abwesend
        </span>
      ) : null}
      <select
        className="h-9 shrink-0 rounded-lg border border-border bg-surface px-2 text-sm text-foreground"
        onChange={(event) => onStatusChange(event.target.value)}
        value="NOT_USED"
      >
        <option value="NOT_USED">Nicht eingesetzt</option>
        <option value="STARTER">Startelf</option>
        <option value="SUBSTITUTE">Einwechslung</option>
      </select>
    </div>
  );
}

function CompactNumber({
  accent,
  label,
  max,
  name,
  step = "1",
  value,
}: {
  accent?: "red" | "yellow";
  label: string;
  max?: number;
  name: string;
  step?: string;
  value?: number;
}) {
  const accentClass =
    accent === "yellow" ? "border-warning-soft bg-warning-soft" : accent === "red" ? "border-danger-soft bg-danger-soft" : "border-border bg-surface";

  return (
    <label className="text-xs font-semibold uppercase text-muted">
      <span className="lg:sr-only">{label}</span>
      <input
        aria-label={label}
        className={`mt-1 h-9 w-full rounded-lg border px-2 text-sm font-semibold tabular-nums text-foreground ${accentClass}`}
        defaultValue={value ?? ""}
        max={max}
        min={0}
        name={name}
        step={step}
        type="number"
      />
    </label>
  );
}
