"use client";

import { useMemo, useState } from "react";

import { AvailabilityRow } from "@/app/abwesenheiten/availability-row";
import { SortableHeader } from "@/components/sortable-header";

type Availability = {
  id: string;
  type: string;
  startsAt: Date;
  endsAt: Date | null;
  note: string | null;
  playerName: string;
};

type SortKey = "playerName" | "type" | "startsAt" | "note";

export function AvailabilityList({ availabilities }: { availabilities: Availability[] }) {
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

  const sorted = useMemo(() => {
    if (!sortKey) {
      return availabilities;
    }

    const dir = sortDir === "asc" ? 1 : -1;

    return [...availabilities].sort((a, b) => {
      switch (sortKey) {
        case "playerName":
          return a.playerName.localeCompare(b.playerName) * dir;
        case "type":
          return a.type.localeCompare(b.type) * dir;
        case "startsAt":
          return (a.startsAt.getTime() - b.startsAt.getTime()) * dir;
        case "note":
          return (a.note ?? "").localeCompare(b.note ?? "") * dir;
        default:
          return 0;
      }
    });
  }, [availabilities, sortKey, sortDir]);

  return (
    <div className="overflow-x-auto">
      <div className="hidden min-w-[760px] grid-cols-[1fr_140px_1fr_1fr_auto] gap-3 border-b border-border bg-surface-muted px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
        <SortableHeader label="Spieler" onClick={() => toggleSort("playerName")} sortDir={sortKey === "playerName" ? sortDir : null} />
        <SortableHeader label="Typ" onClick={() => toggleSort("type")} sortDir={sortKey === "type" ? sortDir : null} />
        <SortableHeader label="Zeitraum" onClick={() => toggleSort("startsAt")} sortDir={sortKey === "startsAt" ? sortDir : null} />
        <SortableHeader label="Notiz" onClick={() => toggleSort("note")} sortDir={sortKey === "note" ? sortDir : null} />
        <span>Aktionen</span>
      </div>
      <div className="min-w-[760px] divide-y divide-border md:min-w-0">
        {sorted.map((availability) => (
          <AvailabilityRow availability={availability} key={availability.id} redirectTo="/abwesenheiten" />
        ))}
      </div>
    </div>
  );
}
