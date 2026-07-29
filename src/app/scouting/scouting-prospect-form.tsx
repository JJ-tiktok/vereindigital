"use client";

import { useActionState } from "react";

import { createScoutingProspect, updateScoutingProspect, type ActionState } from "@/lib/actions";
import { toDateInputValue } from "@/lib/format";
import { scoutingPositions } from "@/lib/scouting";

export function ScoutingProspectForm({
  prospect,
  embedded = false,
}: {
  prospect?: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: Date | null;
    position: string | null;
    currentClub: string | null;
    phone: string | null;
    email: string | null;
    source: string | null;
    interestLevel: number | null;
    notes: string | null;
  };
  embedded?: boolean;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    prospect ? updateScoutingProspect : createScoutingProspect,
    null,
  );

  return (
    <form action={formAction} className={embedded ? "" : "max-w-3xl rounded-lg border border-border bg-surface p-6"}>
      {prospect ? <input name="prospectId" type="hidden" value={prospect.id} /> : null}

      {state?.error ? (
        <p className="mb-5 rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{state.error}</p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          defaultValue={prospect?.firstName}
          error={state?.fieldErrors?.firstName?.[0]}
          label="Vorname"
          name="firstName"
          required
        />
        <Field
          defaultValue={prospect?.lastName}
          error={state?.fieldErrors?.lastName?.[0]}
          label="Nachname"
          name="lastName"
          required
        />
        <div>
          <label className="text-sm font-semibold text-foreground" htmlFor="birthDate">
            Geburtsdatum
          </label>
          <input
            className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            defaultValue={prospect?.birthDate ? toDateInputValue(prospect.birthDate) : undefined}
            id="birthDate"
            name="birthDate"
            type="date"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground" htmlFor="position">
            Position
          </label>
          <select
            className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            defaultValue={prospect?.position ?? ""}
            id="position"
            name="position"
          >
            <option value="">Unbekannt</option>
            {scoutingPositions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </div>
        <Field defaultValue={prospect?.currentClub ?? undefined} label="Aktueller Verein" name="currentClub" />
        <Field defaultValue={prospect?.phone ?? undefined} label="Telefon" name="phone" type="tel" />
        <Field defaultValue={prospect?.email ?? undefined} label="E-Mail" name="email" type="email" />
        <Field defaultValue={prospect?.source ?? undefined} label="Quelle / Empfehlung" name="source" />
        <div>
          <label className="text-sm font-semibold text-foreground" htmlFor="interestLevel">
            Beobachtungsprioritaet
          </label>
          <select
            className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            defaultValue={prospect?.interestLevel?.toString() ?? ""}
            id="interestLevel"
            name="interestLevel"
          >
            <option value="">Nicht gesetzt</option>
            {[1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                {"★".repeat(level)} ({level})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5">
        <label className="text-sm font-semibold text-foreground" htmlFor="notes">
          Notizen
        </label>
        <textarea
          className="mt-2 min-h-24 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
          defaultValue={prospect?.notes ?? undefined}
          id="notes"
          name="notes"
        />
      </div>

      <button
        className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Speichern..." : prospect ? "Prospect speichern" : "Prospect anlegen"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  error,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-foreground" htmlFor={name}>
        {label}
      </label>
      <input
        className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
        defaultValue={defaultValue}
        id={name}
        name={name}
        required={required}
        type={type}
      />
      {error ? <p className="mt-1 text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  );
}
