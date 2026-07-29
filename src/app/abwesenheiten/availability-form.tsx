"use client";

import { useActionState } from "react";

import { createPlayerAvailability, type ActionState } from "@/lib/actions";

export function AvailabilityForm({
  players,
}: {
  players: { id: string; firstName: string; lastName: string }[];
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createPlayerAvailability, null);

  return (
    <form action={formAction} className="mt-5 space-y-5">
      {state?.error ? (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{state.error}</p>
      ) : null}
      <div>
        <label className="text-sm font-semibold text-foreground" htmlFor="playerProfileId">
          Spieler
        </label>
        <select className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm" id="playerProfileId" name="playerProfileId">
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.firstName} {player.lastName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-semibold text-foreground" htmlFor="type">
          Typ
        </label>
        <select className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm" id="type" name="type">
          <option value="VACATION">Urlaub</option>
          <option value="INJURY">Verletzung</option>
          <option value="ILLNESS">Krankheit</option>
          <option value="OTHER">Sonstiges</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimeField error={state?.fieldErrors?.startsAt?.[0]} label="Start" name="startsAt" />
        <DateTimeField error={state?.fieldErrors?.endsAt?.[0]} label="Ende" name="endsAt" />
      </div>
      <div>
        <label className="text-sm font-semibold text-foreground" htmlFor="note">
          Notiz
        </label>
        <textarea className="mt-2 min-h-24 w-full rounded-lg border border-border px-3 py-2 text-sm" id="note" name="note" />
      </div>
      <button
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Speichern..." : "Abwesenheit speichern"}
      </button>
    </form>
  );
}

function DateTimeField({ error, label, name }: { error?: string; label: string; name: string }) {
  return (
    <div>
      <label className="text-sm font-semibold text-foreground" htmlFor={name}>
        {label}
      </label>
      <input className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm" id={name} name={name} required type="datetime-local" />
      {error ? <p className="mt-1 text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  );
}
