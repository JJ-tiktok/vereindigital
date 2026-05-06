-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- Backfill one structured season for each existing club/season label.
WITH season_defaults AS (
    SELECT
        CASE
            WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 7 THEN EXTRACT(YEAR FROM CURRENT_DATE)::INT
            ELSE EXTRACT(YEAR FROM CURRENT_DATE)::INT - 1
        END AS start_year
),
club_season_labels AS (
    SELECT DISTINCT
        t."clubId",
        COALESCE(
            NULLIF(t."season", ''),
            (sd.start_year::TEXT || '/' || RIGHT((sd.start_year + 1)::TEXT, 2))
        ) AS name,
        sd.start_year
    FROM "teams" t
    CROSS JOIN season_defaults sd
),
inserted_seasons AS (
    INSERT INTO "seasons" ("id", "clubId", "name", "startsAt", "endsAt", "isActive", "updatedAt")
    SELECT
        gen_random_uuid()::TEXT,
        csl."clubId",
        csl.name,
        MAKE_DATE(csl.start_year, 7, 1)::TIMESTAMP(3),
        (MAKE_DATE(csl.start_year + 1, 6, 30)::TIMESTAMP(3) + INTERVAL '23 hours 59 minutes 59 seconds'),
        false,
        CURRENT_TIMESTAMP
    FROM club_season_labels csl
    RETURNING "id", "clubId", "name"
)
SELECT 1;

-- Make sure clubs without teams also receive an active season.
WITH season_defaults AS (
    SELECT
        CASE
            WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 7 THEN EXTRACT(YEAR FROM CURRENT_DATE)::INT
            ELSE EXTRACT(YEAR FROM CURRENT_DATE)::INT - 1
        END AS start_year
)
INSERT INTO "seasons" ("id", "clubId", "name", "startsAt", "endsAt", "isActive", "updatedAt")
SELECT
    gen_random_uuid()::TEXT,
    c."id",
    sd.start_year::TEXT || '/' || RIGHT((sd.start_year + 1)::TEXT, 2),
    MAKE_DATE(sd.start_year, 7, 1)::TIMESTAMP(3),
    (MAKE_DATE(sd.start_year + 1, 6, 30)::TIMESTAMP(3) + INTERVAL '23 hours 59 minutes 59 seconds'),
    false,
    CURRENT_TIMESTAMP
FROM "clubs" c
CROSS JOIN season_defaults sd
WHERE NOT EXISTS (
    SELECT 1 FROM "seasons" s WHERE s."clubId" = c."id"
);

-- AddForeignKey-ready nullable column first, then backfill.
ALTER TABLE "teams" ADD COLUMN "seasonId" TEXT;

WITH season_defaults AS (
    SELECT
        CASE
            WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 7 THEN EXTRACT(YEAR FROM CURRENT_DATE)::INT
            ELSE EXTRACT(YEAR FROM CURRENT_DATE)::INT - 1
        END AS start_year
)
UPDATE "teams" t
SET "seasonId" = s."id"
FROM "seasons" s
CROSS JOIN season_defaults sd
WHERE s."clubId" = t."clubId"
  AND s."name" = COALESCE(NULLIF(t."season", ''), sd.start_year::TEXT || '/' || RIGHT((sd.start_year + 1)::TEXT, 2));

-- Mark the most recent/current-looking season per club as active.
WITH ranked AS (
    SELECT
        s."id",
        ROW_NUMBER() OVER (PARTITION BY s."clubId" ORDER BY s."startsAt" DESC, s."createdAt" DESC) AS rn
    FROM "seasons" s
)
UPDATE "seasons" s
SET "isActive" = ranked.rn = 1
FROM ranked
WHERE ranked."id" = s."id";

ALTER TABLE "teams" ALTER COLUMN "seasonId" SET NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "teams_clubId_name_season_key";

-- CreateIndex
CREATE UNIQUE INDEX "seasons_clubId_name_key" ON "seasons"("clubId", "name");

-- CreateIndex
CREATE INDEX "seasons_clubId_isActive_idx" ON "seasons"("clubId", "isActive");

-- CreateIndex
CREATE INDEX "teams_seasonId_idx" ON "teams"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_clubId_seasonId_name_key" ON "teams"("clubId", "seasonId", "name");

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
