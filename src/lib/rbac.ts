export const permissionKeys = [
  "club.manage",
  "team.manage",
  "team.members.manage",
  "roles.manage",
  "invitations.manage",
  "calendar.events.read",
  "calendar.events.manage",
  "attendance.self.manage",
  "attendance.manage",
  "availability.self.manage",
  "availability.manage",
  "player.profile.self.update",
  "player.profile.manage",
  "match.read",
  "match.manage",
  "match.stats.manage",
  "training.catalog.read",
  "training.catalog.manage",
  "training.plan.manage",
] as const;

export type PermissionKey = (typeof permissionKeys)[number];

export const defaultRoles = [
  {
    key: "admin",
    name: "Admin",
    permissions: permissionKeys,
  },
  {
    key: "trainer",
    name: "Trainer",
    permissions: [
      "team.manage",
      "team.members.manage",
      "invitations.manage",
      "calendar.events.read",
      "calendar.events.manage",
      "attendance.manage",
      "availability.manage",
      "player.profile.manage",
      "match.read",
      "match.manage",
      "match.stats.manage",
      "training.catalog.read",
      "training.catalog.manage",
      "training.plan.manage",
    ],
  },
  {
    key: "assistant_coach",
    name: "Co-Trainer",
    permissions: [
      "team.manage",
      "team.members.manage",
      "invitations.manage",
      "calendar.events.read",
      "calendar.events.manage",
      "attendance.manage",
      "availability.manage",
      "player.profile.manage",
      "match.read",
      "match.manage",
      "match.stats.manage",
      "training.catalog.read",
      "training.catalog.manage",
      "training.plan.manage",
    ],
  },
  {
    key: "player",
    name: "Spieler",
    permissions: [
      "calendar.events.read",
      "attendance.self.manage",
      "availability.self.manage",
      "player.profile.self.update",
      "match.read",
      "training.catalog.read",
    ],
  },
] as const satisfies ReadonlyArray<{
  key: string;
  name: string;
  permissions: readonly PermissionKey[];
}>;
