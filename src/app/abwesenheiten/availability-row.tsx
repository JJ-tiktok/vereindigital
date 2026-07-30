"use client";

import { useActionState, useState } from "react";

import { deletePlayerAvailability, updatePlayerAvailability, type ActionState } from "@/lib/actions";
import { toDateTimeLocalValue } from "@/lib/format";

type Availability = {
  id: string;
  type: string;
  startsAt: Date;
  endsAt: Date | null;
  note: string | null;
  playerName: string;
};

export function AvailabilityRow({ availability, redirectTo }: { availability: Availability; redirectTo?: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(updatePlayerAvailability, null);

  if (isEditing) {
    return (
      <form action={formAction} className="grid gap-3 p-5 md:grid-cols-[1fr_140px_1fr_1fr_auto] md:items-start">
        <input name="availabilityId" type="hidden" value={availability.id} />
        {redirectTo ? <input name="redirectTo" type="hidden" value={redirectTo} /> : null}
        <p className="pt-2 font-semibold text-foreground">{availability.playerName}</p>
        <select className="h-10 rounded-lg border border-border px-2 text-sm" defaultValue={availability.type} name="type">
          <option value="VACATION">Urlaub</option>
          <option value="INJURY">Verletzung</option>
          <option value="ILLNESS">Krankheit</option>
          <option value="OTHER">Sonstiges</option>
        </select>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="h-10 rounded-lg border border-border px-2 text-sm"
            defaultValue={toDateTimeLocalValue(availability.startsAt)}
            name="startsAt"
            required
            type="datetime-local"
          />
          <input
            className="h-10 rounded-lg border border-border px-2 text-sm"
            defaultValue={availability.endsAt ? toDateTimeLocalValue(availability.endsAt) : ""}
            name="endsAt"
            placeholder="Unbefristet"
            type="datetime-local"
          />
        </div>
        <input className="h-10 rounded-lg border border-border px-2 text-sm" defaultValue={availability.note ?? ""} name="note" placeholder="Notiz" />
        <div className="flex items-start gap-2">
          <button
            className="h-10 rounded-lg bg-primary px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "..." : "Speichern"}
          </button>
          <button
            className="h-10 rounded-lg border border-border px-3 text-sm font-semibold text-foreground"
            onClick={() => setIsEditing(false)}
            type="button"
          >
            Abbrechen
          </button>
        </div>
        {state?.error ? (
          <p className="md:col-span-5 rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{state.error}</p>
        ) : null}
        {state?.fieldErrors?.endsAt?.[0] ? (
          <p className="md:col-span-5 rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{state.fieldErrors.endsAt[0]}</p>
        ) : null}
      </form>
    );
  }

  return (
    <div className="grid gap-3 p-5 md:grid-cols-[1fr_140px_1fr_1fr_auto] md:items-center">
      <p className="font-semibold text-foreground">{availability.playerName}</p>
      <span className="w-max rounded-full bg-surface-muted px-3 py-1 text-center text-xs font-semibold text-foreground">
        {availabilityTypeLabel(availability.type)}
      </span>
      <p className="text-sm text-muted">
        {formatRange(availability.startsAt)} bis {availability.endsAt ? formatRange(availability.endsAt) : "auf Weiteres"}
      </p>
      <p className="text-sm text-muted">{availability.note || "Keine Notiz"}</p>
      <div className="flex items-center gap-2">
        <button className="h-9 rounded-lg border border-border px-3 text-xs font-semibold text-foreground" onClick={() => setIsEditing(true)} type="button">
          Bearbeiten
        </button>
        <form
          action={deletePlayerAvailability}
          onSubmit={(event) => {
            if (!window.confirm("Diese Abwesenheit wirklich loeschen?")) {
              event.preventDefault();
            }
          }}
        >
          <input name="availabilityId" type="hidden" value={availability.id} />
          {redirectTo ? <input name="redirectTo" type="hidden" value={redirectTo} /> : null}
          <button className="h-9 rounded-lg border border-danger-soft px-3 text-xs font-semibold text-danger" type="submit">
            Loeschen
          </button>
        </form>
      </div>
    </div>
  );
}

function formatRange(value: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function availabilityTypeLabel(type: string) {
  switch (type) {
    case "VACATION":
      return "Urlaub";
    case "INJURY":
      return "Verletzung";
    case "ILLNESS":
      return "Krankheit";
    default:
      return "Sonstiges";
  }
}
