"use client";

import { useActionState } from "react";

import { createPlayerProfile, updatePlayerProfile, type ActionState } from "@/lib/actions";
import { toDateTimeLocalValue } from "@/lib/format";

const positions = ["TW", "IV", "AV", "DM", "ZM", "OM", "FL", "ST"];

export function PlayerForm({
  player,
  embedded = false,
}: {
  player?: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: Date | null;
    position: string | null;
  };
  embedded?: boolean;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    player ? updatePlayerProfile : createPlayerProfile,
    null,
  );

  return (
    <form action={formAction} className={embedded ? "" : "max-w-2xl rounded-lg border border-border bg-white p-6"}>
      {player ? <input name="playerId" type="hidden" value={player.id} /> : null}

      {state?.error ? (
        <p className="mb-5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{state.error}</p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          defaultValue={player?.firstName}
          error={state?.fieldErrors?.firstName?.[0]}
          label="Vorname"
          name="firstName"
        />
        <Field
          defaultValue={player?.lastName}
          error={state?.fieldErrors?.lastName?.[0]}
          label="Nachname"
          name="lastName"
        />
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor="birthDate">
            Geburtsdatum
          </label>
          <input
            className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
            defaultValue={player?.birthDate ? toDateTimeLocalValue(player.birthDate).slice(0, 10) : undefined}
            id="birthDate"
            name="birthDate"
            required
            type="date"
          />
          {state?.fieldErrors?.birthDate?.[0] ? (
            <p className="mt-1 text-xs font-semibold text-rose-700">{state.fieldErrors.birthDate[0]}</p>
          ) : null}
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor="position">
            Position
          </label>
          <select
            className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
            defaultValue={player?.position ?? "ST"}
            id="position"
            name="position"
          >
            {positions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Speichern..." : player ? "Spieler speichern" : "Spieler anlegen"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-800" htmlFor={name}>
        {label}
      </label>
      <input
        className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
        defaultValue={defaultValue}
        id={name}
        name={name}
        required
      />
      {error ? <p className="mt-1 text-xs font-semibold text-rose-700">{error}</p> : null}
    </div>
  );
}
