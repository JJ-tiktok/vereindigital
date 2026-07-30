"use client";

import { useMemo, useState } from "react";

import { MembershipRow } from "@/app/mitglieder/membership-row";
import { SortableHeader } from "@/components/sortable-header";

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

type SortKey = "label" | "roleName" | "status" | "typeLabel" | "createdAt";

export function MembershipTable({
  memberships,
  kind,
  roles,
  canEdit,
}: {
  memberships: Membership[];
  kind: "club" | "team";
  roles: Option[];
  canEdit: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) {
      return memberships;
    }

    const dir = sortDir === "asc" ? 1 : -1;

    return [...memberships].sort((a, b) => {
      switch (sortKey) {
        case "label":
          return a.label.localeCompare(b.label) * dir;
        case "roleName":
          return a.roleName.localeCompare(b.roleName) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "typeLabel":
          return a.typeLabel.localeCompare(b.typeLabel) * dir;
        case "createdAt":
          return (a.createdAt.getTime() - b.createdAt.getTime()) * dir;
        default:
          return 0;
      }
    });
  }, [memberships, sortKey, sortDir]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[760px] w-full text-left text-sm">
        <thead className="bg-surface-muted text-xs font-semibold uppercase tracking-wide text-muted">
          <tr>
            <th className="px-5 py-3">
              <SortableHeader label="Mitglied" onClick={() => toggleSort("label")} sortDir={sortKey === "label" ? sortDir : null} />
            </th>
            <th className="px-5 py-3">
              <SortableHeader label="Rolle" onClick={() => toggleSort("roleName")} sortDir={sortKey === "roleName" ? sortDir : null} />
            </th>
            <th className="px-5 py-3">
              <SortableHeader label="Status" onClick={() => toggleSort("status")} sortDir={sortKey === "status" ? sortDir : null} />
            </th>
            <th className="px-5 py-3">
              <SortableHeader label="Typ" onClick={() => toggleSort("typeLabel")} sortDir={sortKey === "typeLabel" ? sortDir : null} />
            </th>
            <th className="px-5 py-3">
              <SortableHeader label="Seit / Aktionen" onClick={() => toggleSort("createdAt")} sortDir={sortKey === "createdAt" ? sortDir : null} />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((membership) => (
            <MembershipRow canEdit={canEdit} key={membership.id} kind={kind} membership={membership} roles={roles} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
