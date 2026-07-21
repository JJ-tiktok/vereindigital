import { describe, expect, it } from "vitest";

import {
  collectPermissionKeys,
  collectTeamPermissionKeys,
  resolveActiveTeam,
  resolvePermission,
} from "@/lib/authz";

function membership(teamId: string, keys: string[]) {
  return {
    teamId,
    role: {
      rolePermissions: keys.map((key) => ({ permission: { key } })),
    },
  };
}

describe("collectPermissionKeys", () => {
  it("collects the union of permission keys across memberships", () => {
    const keys = collectPermissionKeys([
      membership("t1", ["calendar.events.read", "attendance.self.manage"]),
      membership("t2", ["calendar.events.read", "match.read"]),
    ]);

    expect(keys).toEqual(new Set(["calendar.events.read", "attendance.self.manage", "match.read"]));
  });

  it("returns an empty set without memberships", () => {
    expect(collectPermissionKeys([])).toEqual(new Set());
  });
});

describe("collectTeamPermissionKeys", () => {
  it("groups permissions per team and merges multiple roles in the same team", () => {
    const byTeam = collectTeamPermissionKeys([
      membership("t1", ["calendar.events.read"]),
      membership("t1", ["match.read"]),
      membership("t2", ["training.catalog.read"]),
    ]);

    expect(byTeam.get("t1")).toEqual(new Set(["calendar.events.read", "match.read"]));
    expect(byTeam.get("t2")).toEqual(new Set(["training.catalog.read"]));
  });
});

describe("resolvePermission", () => {
  const clubPermissions = new Set(["club.manage"]);
  const teamPermissions = new Map([["t1", new Set(["calendar.events.manage"])]]);

  it("grants club-level permissions regardless of team scope", () => {
    expect(resolvePermission(clubPermissions, teamPermissions, "club.manage")).toBe(true);
    expect(resolvePermission(clubPermissions, teamPermissions, "club.manage", "t99")).toBe(true);
  });

  it("grants team permissions only for the matching team", () => {
    expect(resolvePermission(clubPermissions, teamPermissions, "calendar.events.manage", "t1")).toBe(true);
    expect(resolvePermission(clubPermissions, teamPermissions, "calendar.events.manage", "t2")).toBe(false);
  });

  it("denies team permissions without a team scope", () => {
    expect(resolvePermission(clubPermissions, teamPermissions, "calendar.events.manage")).toBe(false);
  });

  it("denies unknown permissions", () => {
    expect(resolvePermission(clubPermissions, teamPermissions, "match.manage", "t1")).toBe(false);
  });
});

describe("resolveActiveTeam", () => {
  const teams = [{ id: "a" }, { id: "b" }];

  it("prefers the cookie team when it is accessible", () => {
    expect(resolveActiveTeam(teams, "b")).toEqual({ id: "b" });
  });

  it("falls back to the first team for unknown or missing preferences", () => {
    expect(resolveActiveTeam(teams, "nope")).toEqual({ id: "a" });
    expect(resolveActiveTeam(teams)).toEqual({ id: "a" });
  });

  it("returns null without teams", () => {
    expect(resolveActiveTeam([], "a")).toBeNull();
  });
});
