"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { bulkAcceptEventAttendance, updateEventAttendance } from "@/lib/actions";
import { getInitials } from "@/lib/format";

type AttendanceStatus = "ACCEPTED" | "MAYBE" | "DECLINED";

type PlayerRow = {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  status: AttendanceStatus | null;
  reason: string | null;
};

const statusMeta: Record<AttendanceStatus, { label: string; dot: string }> = {
  ACCEPTED: { label: "Zusage", dot: "bg-success" },
  MAYBE: { label: "Vielleicht", dot: "bg-warning" },
  DECLINED: { label: "Absage", dot: "bg-danger" },
};

const gridCols = "lg:grid-cols-[minmax(200px,1.3fr)_110px_150px_1fr]";

export function AttendancePanel({ eventId, players }: { eventId: string; players: PlayerRow[] }) {
  const openPlayers = players.filter((player) => !player.status);
  const counts = players.reduce(
    (acc, player) => {
      if (player.status) {
        acc[player.status] += 1;
      } else {
        acc.OPEN += 1;
      }
      return acc;
    },
    { ACCEPTED: 0, MAYBE: 0, DECLINED: 0, OPEN: 0 },
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-5">
        <SummaryPill className="bg-success-soft text-success" count={counts.ACCEPTED} label="Zusagen" />
        <SummaryPill className="bg-warning-soft text-warning" count={counts.MAYBE} label="Vielleicht" />
        <SummaryPill className="bg-danger-soft text-danger" count={counts.DECLINED} label="Absagen" />
        <SummaryPill className="bg-surface-muted text-muted" count={counts.OPEN} label="Offen" />

        {openPlayers.length > 0 ? (
          <form action={bulkAcceptEventAttendance} className="ml-auto">
            <input name="calendarEventId" type="hidden" value={eventId} />
            {openPlayers.map((player) => (
              <input key={player.id} name="openPlayerProfileId" type="hidden" value={player.id} />
            ))}
            <BulkAcceptButton count={openPlayers.length} />
          </form>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className={`hidden min-w-[720px] gap-3 border-b border-border bg-surface-muted px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted lg:grid ${gridCols}`}>
          <span>Spieler</span>
          <span>Position</span>
          <span>Status</span>
          <span>Grund</span>
        </div>
        <div className="divide-y divide-border">
          {players.map((player) => (
            <AttendanceRow eventId={eventId} key={player.id} player={player} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryPill({ label, count, className }: { label: string; count: number; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${className}`}>
      <span className="text-base font-bold">{count}</span>
      {label}
    </span>
  );
}

function BulkAcceptButton({ count }: { count: number }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-9 items-center rounded-lg border border-primary bg-primary-soft px-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Wird gesetzt..." : `${count} offene auf Zusage setzen`}
    </button>
  );
}

function AttendanceRow({ eventId, player }: { eventId: string; player: PlayerRow }) {
  const [status, setStatus] = useState<AttendanceStatus>(player.status ?? "ACCEPTED");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      action={updateEventAttendance}
      className={`grid min-w-0 items-start gap-3 p-4 lg:min-w-[720px] lg:items-center ${gridCols}`}
      ref={formRef}
    >
      <input name="calendarEventId" type="hidden" value={eventId} />
      <input name="playerProfileId" type="hidden" value={player.id} />

      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-foreground">
          {getInitials(player.firstName, player.lastName)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">
            {player.firstName} {player.lastName}
          </p>
          {!player.status ? <p className="text-xs font-semibold text-muted">Offen</p> : null}
        </div>
      </div>

      <span className="w-max rounded-lg bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground">
        {player.position ?? "-"}
      </span>

      <div className="flex items-center gap-2">
        <span className={`size-2.5 shrink-0 rounded-full ${player.status ? statusMeta[player.status].dot : "bg-border"}`} />
        <select
          className="h-10 w-full rounded-lg border border-border px-3 text-sm"
          name="status"
          onChange={(event) => {
            const next = event.target.value as AttendanceStatus;
            setStatus(next);
            if (next !== "DECLINED") {
              formRef.current?.requestSubmit();
            }
          }}
          value={status}
        >
          <option value="ACCEPTED">Zusage</option>
          <option value="MAYBE">Vielleicht</option>
          <option value="DECLINED">Absage</option>
        </select>
      </div>

      {status === "DECLINED" ? (
        <div className="flex items-center gap-2">
          <input
            className="h-10 min-w-0 flex-1 rounded-lg border border-border px-3 text-sm"
            defaultValue={player.reason ?? ""}
            name="reason"
            placeholder="Grund (Pflicht bei Absage)"
          />
          <SubmitButton />
        </div>
      ) : (
        <SaveIndicator />
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="h-10 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Speichert..." : "Speichern"}
    </button>
  );
}

function SaveIndicator() {
  const { pending } = useFormStatus();

  if (!pending) {
    return null;
  }

  return <span className="text-xs font-semibold text-muted">Wird gespeichert...</span>;
}
