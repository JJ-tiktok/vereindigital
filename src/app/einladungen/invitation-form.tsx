"use client";

import { useActionState } from "react";

import { Send } from "lucide-react";

import { createInvitation, type ActionState } from "@/lib/actions";

export function InvitationForm({
  teams,
  roles,
  created,
  emailed,
}: {
  teams: { id: string; name: string }[];
  roles: { id: string; name: string }[];
  created?: boolean;
  emailed?: boolean;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createInvitation, null);

  return (
    <form action={formAction} className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center gap-2">
        <Send className="size-5 text-primary" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-foreground">Neue Einladung</h2>
      </div>

      {created && !state ? (
        <p className="mt-4 rounded-lg bg-success-soft px-3 py-2 text-sm font-semibold text-success">
          {emailed
            ? "Einladung wurde erstellt und per E-Mail verschickt."
            : "Einladung wurde erstellt. Du kannst den Link jetzt kopieren."}
        </p>
      ) : null}
      {state?.error ? (
        <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{state.error}</p>
      ) : null}

      <Field label="Team">
        <select className="h-11 w-full rounded-lg border border-border px-3 text-sm" name="teamId" required>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Rolle">
        <select className="h-11 w-full rounded-lg border border-border px-3 text-sm" name="roleId" required>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="E-Mail optional">
        <input
          className="h-11 w-full rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
          name="email"
          placeholder="max@example.com"
          type="email"
        />
      </Field>

      <Field label="Gueltigkeit">
        <select className="h-11 w-full rounded-lg border border-border px-3 text-sm" defaultValue="14" name="expiresInDays">
          <option value="3">3 Tage</option>
          <option value="7">7 Tage</option>
          <option value="14">14 Tage</option>
          <option value="30">30 Tage</option>
        </select>
      </Field>

      <button
        className="mt-5 h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Wird erstellt..." : "Einladung erstellen"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-5 block">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
