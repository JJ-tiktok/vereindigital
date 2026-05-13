import type { AppContext } from "@/lib/app-context";

export function canUseFeedback(context: AppContext) {
  return context.isClubAdmin || getActiveTeamRoleKeys(context).some((key) => ["trainer", "assistant_coach"].includes(key));
}

export function getActiveTeamRoleKeys(context: AppContext) {
  const activeTeamId = context.activeTeam?.id;

  if (!activeTeamId) {
    return [];
  }

  return context.appUser.memberships
    .filter((membership) => membership.status === "ACTIVE" && membership.teamId === activeTeamId)
    .map((membership) => membership.role.key);
}
