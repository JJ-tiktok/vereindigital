"use client";

import type { ScoutingStatus } from "@prisma/client";
import Link from "next/link";
import { useMemo, useState } from "react";

import { formatDate } from "@/lib/format";
import { scoutingStatusLabel, scoutingStatusValues } from "@/lib/scouting";

export type ScoutingRow = {
  id: string;
  name: string;
  initials: string;
  position: string | null;
  currentClub: string | null;
  status: ScoutingStatus;
  interestLevel: number | null;
  lastContact: string | null;
};

export function ScoutingTable({ prospects }: { prospects: ScoutingRow[] }) {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState<"" | ScoutingStatus>("");

  const positionOptions = useMemo(() => {
    const values = new Set<string>();
    for (const prospect of prospects) {
      if (prospect.position) {
        values.add(prospect.position);
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [prospects]);

  const filteredProspects = useMemo(() => {
    const term = search.trim().toLowerCase();

    return prospects.filter((prospect) => {
      if (term && !prospect.name.toLowerCase().includes(term)) {
        return false;
      }
      if (position && prospect.position !== position) {
        return false;
      }
      if (status && prospect.status !== status) {
        return false;
      }
      return true;
    });
  }, [prospects, search, position, status]);

  return (
    <>
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
            <option value="">Alle Status</option>
            {scoutingStatusValues.map((option) => (
              <option key={option} value={option}>
                {scoutingStatusLabel(option)}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <SearchIcon />
          <input
            className="h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft sm:w-72"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Prospect suchen..."
            type="search"
            value={search}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border bg-surface-muted px-5 py-3">
          <div className="grid grid-cols-[minmax(220px,1.3fr)_90px_160px_140px_110px_140px] gap-4 text-xs font-semibold uppercase tracking-wide text-muted max-lg:hidden">
            <span>Prospect</span>
            <span>Position</span>
            <span>Aktueller Verein</span>
            <span>Status</span>
            <span>Prioritaet</span>
            <span>Letzter Kontakt</span>
          </div>
          <div className="lg:hidden">
            <p className="text-xs font-semibold uppercase text-muted">Prospects</p>
          </div>
        </div>

        {filteredProspects.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredProspects.map((prospect) => (
              <Link className="block px-5 py-4 transition hover:bg-blue-50/60" href={`/scouting/${prospect.id}`} key={prospect.id}>
                <div className="grid gap-2 lg:grid-cols-[minmax(220px,1.3fr)_90px_160px_140px_110px_140px] lg:items-center lg:gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-primary-soft text-sm font-bold text-primary">
                      {prospect.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{prospect.name}</p>
                      <p className="mt-1 text-sm text-muted lg:hidden">
                        {prospect.position ?? "?"} · {prospect.currentClub ?? "Verein unbekannt"} ·{" "}
                        {scoutingStatusLabel(prospect.status)}
                      </p>
                    </div>
                  </div>
                  <span className="hidden w-max rounded-lg bg-surface-muted px-3 py-1 text-center text-xs font-semibold text-foreground lg:block">
                    {prospect.position ?? "-"}
                  </span>
                  <span className="hidden text-sm text-foreground lg:block">{prospect.currentClub ?? "-"}</span>
                  <span className="hidden lg:block">
                    <StatusBadge status={prospect.status} />
                  </span>
                  <span className="hidden lg:block">
                    <InterestStars value={prospect.interestLevel} />
                  </span>
                  <span className="hidden text-sm text-foreground lg:block">
                    {prospect.lastContact ? formatDate(new Date(prospect.lastContact)) : "-"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-muted">Keine Prospects gefunden. Passe die Filter an.</div>
        )}

        <div className="flex flex-col gap-3 border-t border-border px-5 py-4 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Zeige {filteredProspects.length > 0 ? 1 : 0} bis {filteredProspects.length} von {prospects.length} Eintraegen
          </span>
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

function StatusBadge({ status }: { status: ScoutingStatus }) {
  const classes: Record<ScoutingStatus, string> = {
    WATCHING: "bg-surface-muted text-foreground",
    CONTACTED: "bg-primary-soft text-primary",
    TRIAL: "bg-warning-soft text-warning",
    OFFER_MADE: "bg-warning-soft text-warning",
    SIGNED: "bg-success-soft text-success",
    REJECTED: "bg-danger-soft text-danger",
    ARCHIVED: "bg-surface-muted text-muted",
  };

  return (
    <span className={`inline-flex w-max items-center rounded-full px-3 py-1 text-xs font-semibold ${classes[status]}`}>
      {scoutingStatusLabel(status)}
    </span>
  );
}

function InterestStars({ value }: { value: number | null }) {
  if (!value) {
    return <span className="text-sm text-muted">-</span>;
  }

  return (
    <span className="text-sm font-semibold text-primary" title={`${value} von 5`}>
      {"★".repeat(value)}
      <span className="text-muted">{"★".repeat(Math.max(0, 5 - value))}</span>
    </span>
  );
}
