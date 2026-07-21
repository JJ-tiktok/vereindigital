import type { PermissionKey } from "@/lib/rbac";

type MembershipWithPermissions = {
  role: {
    rolePermissions: {
      permission: {
        key: string;
      };
    }[];
  };
};

export function collectPermissionKeys(memberships: MembershipWithPermissions[]) {
  const keys = new Set<string>();

  for (const membership of memberships) {
    for (const rolePermission of membership.role.rolePermissions) {
      keys.add(rolePermission.permission.key);
    }
  }

  return keys;
}

export function collectTeamPermissionKeys(memberships: (MembershipWithPermissions & { teamId: string })[]) {
  const byTeam = new Map<string, Set<string>>();

  for (const membership of memberships) {
    const keys = byTeam.get(membership.teamId) ?? new Set<string>();

    for (const rolePermission of membership.role.rolePermissions) {
      keys.add(rolePermission.permission.key);
    }

    byTeam.set(membership.teamId, keys);
  }

  return byTeam;
}

export function resolvePermission(
  clubPermissions: Set<string>,
  teamPermissions: Map<string, Set<string>>,
  key: PermissionKey,
  teamId?: string,
) {
  if (clubPermissions.has(key)) {
    return true;
  }

  if (!teamId) {
    return false;
  }

  return teamPermissions.get(teamId)?.has(key) ?? false;
}

export function resolveActiveTeam<T extends { id: string }>(teams: T[], preferredTeamId?: string) {
  return teams.find((team) => team.id === preferredTeamId) ?? teams[0] ?? null;
}
