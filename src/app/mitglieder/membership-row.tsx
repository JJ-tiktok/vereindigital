"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { updateClubMembershipRole, updateTeamMembershipRole } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";

type Option = { id: string; name: string };

type Membership = {
  id: string;
  label: string;
  email: string | null;
  roleId: string;
  roleName: string;
  status: string;
  typeLabel: string;
  createdAt: Date;
};

export function MembershipRow({
  membership,
  kind,
  roles,
  canEdit,
}: {
  membership: Membership;
  kind: "club" | "team";
  roles: Option[];
  canEdit: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const action = kind === "club" ? updateClubMembershipRole : updateTeamMembershipRole;
  const idField = kind === "club" ? "clubMembershipId" : "teamMembershipId";

  if (isEditing) {
    return (
      <tr>
        <td className="px-5 py-4" colSpan={5}>
          <form action={action} className="flex flex-wrap items-center gap-3">
            <input name={idField} type="hidden" value={membership.id} />
            <div className="flex min-w-0 items-center gap-3">
              <AvatarLabel label={membership.label} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{membership.label}</p>
                <p className="text-sm text-muted">{membership.email ?? "kein App-Login"}</p>
              </div>
            </div>
            <select className="h-10 rounded-lg border border-border px-3 text-sm" defaultValue={membership.roleId} name="roleId">
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <select className="h-10 rounded-lg border border-border px-3 text-sm" defaultValue={membership.status} name="status">
              <option value="ACTIVE">Aktiv</option>
              <option value="INVITED">Eingeladen</option>
              <option value="INACTIVE">Inaktiv</option>
            </select>
            <SubmitButton className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" pendingLabel="Speichert...">
              Speichern
            </SubmitButton>
            <button className="h-10 rounded-lg border border-border px-4 text-sm font-semibold text-foreground" onClick={() => setIsEditing(false)} type="button">
              Abbrechen
            </button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <AvatarLabel label={membership.label} />
          <div>
            <p className="font-semibold text-foreground">{membership.label}</p>
            <p className="text-sm text-muted">{membership.email ?? "kein App-Login"}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className="w-max rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground">{membership.roleName}</span>
      </td>
      <td className="px-5 py-4">
        <span className={statusClass(membership.status)}>{statusLabel(membership.status)}</span>
      </td>
      <td className="px-5 py-4 text-foreground">{membership.typeLabel}</td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-foreground">{membership.createdAt.toLocaleDateString("de-DE")}</span>
          {canEdit ? (
            <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-foreground transition hover:bg-surface-muted" onClick={() => setIsEditing(true)} type="button">
              <Pencil className="size-3.5" aria-hidden="true" />
              Bearbeiten
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function AvatarLabel({ label }: { label: string }) {
  const initials = label
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
      {initials || "?"}
    </div>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "INVITED":
      return "Eingeladen";
    case "INACTIVE":
      return "Inaktiv";
    default:
      return "Aktiv";
  }
}

function statusClass(status: string) {
  const base = "w-max rounded-full px-3 py-1 text-xs font-semibold";

  if (status === "ACTIVE") {
    return `${base} bg-success-soft text-success`;
  }

  if (status === "INVITED") {
    return `${base} bg-warning-soft text-warning`;
  }

  return `${base} bg-surface-muted text-muted`;
}
