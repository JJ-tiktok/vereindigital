"use client";

import { useActionState } from "react";

import { createRole, type ActionState } from "@/lib/actions";

export function CreateRoleForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createRole, null);

  return (
    <form action={formAction} className="rounded-lg border border-border bg-white p-5">
      <h2 className="text-xl font-bold text-slate-950">Neue Rolle</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Erstellt eine leere Rolle ohne Berechtigungen. Berechtigungen danach in der Rollenliste zuweisen.
      </p>

      {state?.error ? (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{state.error}</p>
      ) : null}

      <label className="mt-5 block text-sm font-semibold text-slate-800" htmlFor="name">
        Name
      </label>
      <input
        className="mt-2 h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
        id="name"
        name="name"
        placeholder="z.B. Zeugwart"
        required
      />
      {state?.fieldErrors?.name?.[0] ? (
        <p className="mt-1 text-xs font-semibold text-rose-700">{state.fieldErrors.name[0]}</p>
      ) : null}

      <button
        className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Wird erstellt..." : "Rolle erstellen"}
      </button>
    </form>
  );
}
