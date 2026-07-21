-- Multi-club users: club affiliation is derived from club_memberships only.
-- Backfill a club membership for every user that only has the legacy users."clubId" link.
INSERT INTO "club_memberships" ("id", "clubId", "userId", "roleId", "status", "createdAt", "updatedAt")
SELECT
    'cmbf_' || md5(u."id" || ':' || u."clubId"),
    u."clubId",
    u."id",
    picked."roleId",
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users" u
LEFT JOIN LATERAL (
    SELECT COALESCE(
        (
            SELECT tm."roleId"
            FROM "team_memberships" tm
            JOIN "teams" t ON t."id" = tm."teamId"
            WHERE tm."userId" = u."id"
              AND t."clubId" = u."clubId"
            ORDER BY tm."createdAt" ASC
            LIMIT 1
        ),
        (
            SELECT r."id"
            FROM "roles" r
            WHERE r."clubId" = u."clubId"
              AND r."key" = 'player'
            LIMIT 1
        )
    ) AS "roleId"
) picked ON TRUE
WHERE picked."roleId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "club_memberships" cm
    WHERE cm."userId" = u."id"
      AND cm."clubId" = u."clubId"
  );

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_clubId_fkey";

-- DropIndex
DROP INDEX "users_clubId_idx";

-- DropColumn
ALTER TABLE "users" DROP COLUMN "clubId";

-- Drop dead legacy column (written once at onboarding, never read).
ALTER TABLE "teams" DROP COLUMN "season";

-- Invited players get a profile before their sporting data is known.
ALTER TABLE "player_profiles" ALTER COLUMN "birthDate" DROP NOT NULL;
ALTER TABLE "player_profiles" ALTER COLUMN "position" DROP NOT NULL;

