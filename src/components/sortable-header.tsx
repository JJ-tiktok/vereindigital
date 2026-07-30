"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export function SortableHeader({
  label,
  onClick,
  sortDir,
}: {
  label: string;
  onClick: () => void;
  sortDir: "asc" | "desc" | null;
}) {
  return (
    <button className="inline-flex items-center gap-1 text-left uppercase tracking-wide transition hover:text-foreground" onClick={onClick} type="button">
      {label}
      {sortDir === "asc" ? (
        <ArrowUp className="size-3" aria-hidden="true" />
      ) : sortDir === "desc" ? (
        <ArrowDown className="size-3" aria-hidden="true" />
      ) : (
        <ArrowUpDown className="size-3 opacity-40" aria-hidden="true" />
      )}
    </button>
  );
}
