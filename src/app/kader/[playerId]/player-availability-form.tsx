"use client";

import { useActionState } from "react";

import { createPlayerAvailability, type ActionState } from "@/lib/actions";
import { toDateInputValue } from "@/lib/format";

export function PlayerAvailabilityForm({ playerId }: { playerId: string }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createPlayerAvailability, null);
  const defaultStart = `${toDateInputValue(new Date())}T00:00`;

  return (
    <form action={formAction} className="grid gap-3 border-t border-border p-5 md:grid-cols-4">
      <input name="playerProfileId" type="hidden" value={playerId} />
      <input name="redirectTo" type="hidden" value={`/kader/${playerId}`} />
      {state?.error ? (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger md:col-span-4">{state.error}</p>
      ) : null}
      <label className="text-sm font-semibold text-foreground">
        Typ
        <select className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" name="type">
          <option value="INJURY">Verletzung</option>
          <option value="ILLNESS">Krankheit</option>
          <option value="VACATION">Urlaub</option>
          <option value="OTHER">Sonstiges</option>
        </select>
      </label>
      <label className="text-sm font-semibold text-foreground">
        Von
        <input className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" defaultValue={defaultStart} name="startsAt" required type="datetime-local" />
        {state?.fieldErrors?.startsAt?.[0] ? <p className="mt-1 text-xs font-semibold text-danger">{state.fieldErrors.startsAt[0]}</p> : null}
      </label>
      <label className="text-sm font-semibold text-foreground">
        Bis <span className="font-normal normal-case text-muted">(optional)</span>
        <input className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" name="endsAt" placeholder="Unbefristet" type="datetime-local" />
        {state?.fieldErrors?.endsAt?.[0] ? <p className="mt-1 text-xs font-semibold text-danger">{state.fieldErrors.endsAt[0]}</p> : null}
      </label>
      <label className="text-sm font-semibold text-foreground">
        Notiz
        <input className="mt-2 h-10 w-full rounded-lg border border-border px-3 text-sm" name="note" placeholder="z.B. Aussenbandriss" />
      </label>
      <button
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-4 md:w-max"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Speichern..." : "Abwesenheit eintragen"}
      </button>
      <p className="text-xs text-muted md:col-span-4">
        Betroffene Termine im Zeitraum werden automatisch auf &quot;Absage&quot; gesetzt - sowohl bereits bestehende
        als auch neu angelegte Termine waehrend der Abwesenheit. &quot;Bis&quot; leer lassen, wenn das Ende noch nicht
        feststeht (z.B. bei einer Verletzung).
      </p>
    </form>
  );
}
