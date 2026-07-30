"use client";

import { useActionState, useState } from "react";
import { LinkIcon, Pencil, XCircle } from "lucide-react";

import { CopyInviteLink } from "@/components/copy-invite-link";
import { revokeInvitation, updateInvitation, type ActionState } from "@/lib/actions";

type Option = { id: string; name: string };

type Invitation = {
  id: string;
  roleId: string;
  roleName: string;
  teamId: string | null;
  teamName: string;
  email: string | null;
  status: string;
  expiresAt: Date;
  url: string;
};

export function InvitationRow({
  invitation,
  roles,
  teams,
}: {
  invitation: Invitation;
  roles: Option[];
  teams: Option[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(updateInvitation, null);
  const expired = invitation.expiresAt < new Date();
  const canEdit = invitation.status === "PENDING" && !expired;

  if (isEditing) {
    return (
      <article className="grid gap-4 p-5">
        <form action={formAction} className="grid gap-3 sm:grid-cols-3">
          <input name="invitationId" type="hidden" value={invitation.id} />
          {state?.error ? (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger sm:col-span-3">{state.error}</p>
          ) : null}
          <div>
            <label className="text-xs font-semibold uppercase text-muted">Team</label>
            <select className="mt-1 h-10 w-full rounded-lg border border-border px-2 text-sm" defaultValue={invitation.teamId ?? ""} name="teamId">
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted">Rolle</label>
            <select className="mt-1 h-10 w-full rounded-lg border border-border px-2 text-sm" defaultValue={invitation.roleId} name="roleId">
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted">E-Mail (optional)</label>
            <input className="mt-1 h-10 w-full rounded-lg border border-border px-2 text-sm" defaultValue={invitation.email ?? ""} name="email" type="email" />
          </div>
          <div className="flex items-end gap-2 sm:col-span-3">
            <button
              className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "..." : "Speichern"}
            </button>
            <button className="h-10 rounded-lg border border-border px-4 text-sm font-semibold text-foreground" onClick={() => setIsEditing(false)} type="button">
              Abbrechen
            </button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">{invitation.roleName}</span>
          <span className={statusClass(invitation.status, expired)}>
            {expired && invitation.status === "PENDING" ? "Abgelaufen" : statusLabel(invitation.status)}
          </span>
        </div>
        <h3 className="mt-3 font-semibold text-foreground">{invitation.teamName}</h3>
        <p className="mt-1 text-sm text-muted">
          {invitation.email || "Offener Link"} / gueltig bis {invitation.expiresAt.toLocaleDateString("de-DE")}
        </p>
        <p className="mt-3 flex items-center gap-2 break-all rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">
          <LinkIcon className="size-3 shrink-0" aria-hidden="true" />
          {invitation.url}
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-2 lg:justify-end">
        <CopyInviteLink url={invitation.url} />
        {canEdit ? (
          <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-foreground" onClick={() => setIsEditing(true)} type="button">
            <Pencil className="size-4" aria-hidden="true" />
            Bearbeiten
          </button>
        ) : null}
        {canEdit ? (
          <form action={revokeInvitation}>
            <input name="invitationId" type="hidden" value={invitation.id} />
            <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-danger-soft px-3 text-sm font-semibold text-danger" type="submit">
              <XCircle className="size-4" aria-hidden="true" />
              Widerrufen
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "ACCEPTED":
      return "Angenommen";
    case "EXPIRED":
      return "Abgelaufen";
    case "REVOKED":
      return "Widerrufen";
    default:
      return "Offen";
  }
}

function statusClass(status: string, expired: boolean) {
  const base = "rounded-full px-3 py-1 text-xs font-semibold";

  if (expired || status === "EXPIRED" || status === "REVOKED") {
    return `${base} bg-surface-muted text-muted`;
  }

  if (status === "ACCEPTED") {
    return `${base} bg-success-soft text-success`;
  }

  return `${base} bg-warning-soft text-warning`;
}
