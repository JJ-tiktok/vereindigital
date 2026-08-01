"use client";

import { useMemo, useState } from "react";

import { SortableHeader } from "@/components/sortable-header";
import { updatePlayerTrainingPerformance } from "@/lib/actions";

type PerformanceRow = {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  rating: number | null;
  rpe: number | null;
  note: string | null;
};

type SortKey = "name" | "rating" | "rpe" | "note";

export function TrainingPerformanceTable({ eventId, players }: { eventId: string; players: PerformanceRow[] }) {
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

  const sortedPlayers = useMemo(() => {
    if (!sortKey) {
      return players;
    }

    const dir = sortDir === "asc" ? 1 : -1;

    return [...players].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`) * dir;
        case "rating": {
          const aValue = a.rating ?? -Infinity;
          const bValue = b.rating ?? -Infinity;
          return (aValue - bValue) * dir;
        }
        case "rpe": {
          const aValue = a.rpe ?? -Infinity;
          const bValue = b.rpe ?? -Infinity;
          return (aValue - bValue) * dir;
        }
        case "note":
          return (a.note ?? "").localeCompare(b.note ?? "") * dir;
        default:
          return 0;
      }
    });
  }, [players, sortKey, sortDir]);

  return (
    <div className="overflow-x-auto">
      <div className="hidden min-w-[760px] grid-cols-[minmax(200px,1.3fr)_120px_120px_1fr_110px] gap-3 border-b border-border bg-surface-muted px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted lg:grid">
        <SortableHeader label="Spieler" onClick={() => toggleSort("name")} sortDir={sortKey === "name" ? sortDir : null} />
        <SortableHeader label="Bewertung" onClick={() => toggleSort("rating")} sortDir={sortKey === "rating" ? sortDir : null} />
        <SortableHeader label="Belastung (RPE)" onClick={() => toggleSort("rpe")} sortDir={sortKey === "rpe" ? sortDir : null} />
        <SortableHeader label="Kommentar" onClick={() => toggleSort("note")} sortDir={sortKey === "note" ? sortDir : null} />
        <span />
      </div>
      <div className="divide-y divide-border">
        {sortedPlayers.map((player) => (
          <form
            action={updatePlayerTrainingPerformance}
            className="grid min-w-[760px] gap-3 p-5 lg:min-w-0 lg:grid-cols-[minmax(200px,1.3fr)_120px_120px_1fr_110px] lg:items-center"
            key={player.id}
          >
            <input name="calendarEventId" type="hidden" value={eventId} />
            <input name="playerProfileId" type="hidden" value={player.id} />
            <div>
              <p className="font-semibold text-foreground">
                {player.firstName} {player.lastName}
              </p>
              <p className="text-sm text-muted">{player.position}</p>
            </div>
            <input
              className="h-10 rounded-lg border border-border px-3 text-sm"
              defaultValue={player.rating ?? ""}
              max={10}
              min={1}
              name="rating"
              placeholder="1.0-10.0"
              step="0.1"
              type="number"
            />
            <label className="text-xs font-semibold uppercase text-muted lg:sr-only">
              Belastung (RPE)
              <input
                className="mt-1 h-10 w-full rounded-lg border border-border px-3 text-sm font-normal lg:mt-0"
                defaultValue={player.rpe ?? ""}
                max={10}
                min={1}
                name="rpe"
                placeholder="1-10"
                title="Belastungsempfinden: 1 = sehr leicht, 10 = maximal"
                type="number"
              />
            </label>
            <input
              className="h-10 rounded-lg border border-border px-3 text-sm"
              defaultValue={player.note ?? ""}
              name="note"
              placeholder="Kommentar zur Trainingsleistung"
            />
            <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white" type="submit">
              Speichern
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
