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

export const permissionDefinitions = [
  ["club.manage", "Vereinseinstellungen, Teams und Mitglieder verwalten."],
  ["team.manage", "Teamstammdaten verwalten."],
  ["team.members.manage", "Teammitglieder und Teamrollen verwalten."],
  ["roles.manage", "Rollen und Berechtigungen verwalten."],
  ["invitations.manage", "Einladungen erstellen, versenden und widerrufen."],
  ["calendar.events.read", "Teamkalender und Termine lesen."],
  ["calendar.events.manage", "Trainingseinheiten, Spiele und Events erstellen und bearbeiten."],
  ["attendance.self.manage", "Eigene Rueckmeldungen zu Terminen setzen."],
  ["attendance.manage", "Rueckmeldungen fuer Teammitglieder setzen und bearbeiten."],
  ["availability.self.manage", "Eigene Abwesenheiten verwalten."],
  ["availability.manage", "Abwesenheiten fuer Teammitglieder verwalten."],
  ["player.profile.self.update", "Eigene Spielerprofildaten bearbeiten."],
  ["player.profile.manage", "Spielerprofile im Team verwalten."],
  ["match.read", "Spieltage und Statistiken lesen."],
  ["match.manage", "Spieltage planen und bearbeiten."],
  ["match.stats.manage", "Spielerstatistiken erfassen und bearbeiten."],
  ["training.catalog.read", "Trainingskatalog lesen."],
  ["training.catalog.manage", "Uebungen im Trainingskatalog erstellen und bearbeiten."],
  ["training.plan.manage", "Trainingsplaene aus Uebungen zusammenstellen."],
] as const satisfies ReadonlyArray<readonly [PermissionKey, string]>;

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
