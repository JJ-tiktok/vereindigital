-- CreateEnum
CREATE TYPE "PlayerAttributeCategory" AS ENUM ('TECHNICAL', 'TACTICAL', 'PHYSICAL', 'MENTAL', 'GOALKEEPER', 'POSITION_SPECIFIC');

-- CreateEnum
CREATE TYPE "PlayerPositionGroup" AS ENUM ('ALL', 'GOALKEEPER', 'DEFENDER', 'FULLBACK', 'MIDFIELDER', 'WINGER', 'FORWARD');

-- CreateEnum
CREATE TYPE "PlayerFileEntryType" AS ENUM ('PLAYER_TALK', 'GOAL_AGREEMENT', 'FEEDBACK', 'TRAINING_OBSERVATION', 'MATCH_OBSERVATION', 'DISCIPLINE', 'LOAD_INJURY', 'OTHER');

-- CreateEnum
CREATE TYPE "PlayerFormTrend" AS ENUM ('UP', 'STABLE', 'DOWN');

-- AlterTable
ALTER TABLE "player_match_stats" ALTER COLUMN "rating" TYPE DOUBLE PRECISION USING "rating"::DOUBLE PRECISION;

-- DropConstraint
ALTER TABLE "player_match_stats" DROP CONSTRAINT IF EXISTS "player_match_stats_values_check";

-- CreateTable
CREATE TABLE "player_attribute_definitions" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PlayerAttributeCategory" NOT NULL,
    "positionGroup" "PlayerPositionGroup" NOT NULL DEFAULT 'ALL',
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_attribute_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_attribute_snapshots" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "season" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "ratedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_attribute_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_attribute_ratings" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "attributeDefinitionId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_attribute_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_training_performances" (
    "id" TEXT NOT NULL,
    "calendarEventId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_training_performances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_form_snapshots" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "trend" "PlayerFormTrend" NOT NULL DEFAULT 'STABLE',
    "calculatedFrom" TEXT,
    "notes" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_form_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_file_entries" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "type" "PlayerFileEntryType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "followUpAt" TIMESTAMP(3),
    "season" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_file_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_attribute_definitions_clubId_key_key" ON "player_attribute_definitions"("clubId", "key");

-- CreateIndex
CREATE INDEX "player_attribute_definitions_clubId_category_idx" ON "player_attribute_definitions"("clubId", "category");

-- CreateIndex
CREATE INDEX "player_attribute_definitions_positionGroup_idx" ON "player_attribute_definitions"("positionGroup");

-- CreateIndex
CREATE INDEX "player_attribute_snapshots_playerProfileId_ratedAt_idx" ON "player_attribute_snapshots"("playerProfileId", "ratedAt");

-- CreateIndex
CREATE INDEX "player_attribute_snapshots_teamId_idx" ON "player_attribute_snapshots"("teamId");

-- CreateIndex
CREATE INDEX "player_attribute_snapshots_createdByUserId_idx" ON "player_attribute_snapshots"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "player_attribute_ratings_snapshotId_attributeDefinitionId_key" ON "player_attribute_ratings"("snapshotId", "attributeDefinitionId");

-- CreateIndex
CREATE INDEX "player_attribute_ratings_attributeDefinitionId_idx" ON "player_attribute_ratings"("attributeDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "player_training_performances_calendarEventId_playerProfileId_key" ON "player_training_performances"("calendarEventId", "playerProfileId");

-- CreateIndex
CREATE INDEX "player_training_performances_playerProfileId_idx" ON "player_training_performances"("playerProfileId");

-- CreateIndex
CREATE INDEX "player_training_performances_createdByUserId_idx" ON "player_training_performances"("createdByUserId");

-- CreateIndex
CREATE INDEX "player_form_snapshots_playerProfileId_calculatedAt_idx" ON "player_form_snapshots"("playerProfileId", "calculatedAt");

-- CreateIndex
CREATE INDEX "player_form_snapshots_teamId_idx" ON "player_form_snapshots"("teamId");

-- CreateIndex
CREATE INDEX "player_file_entries_playerProfileId_occurredAt_idx" ON "player_file_entries"("playerProfileId", "occurredAt");

-- CreateIndex
CREATE INDEX "player_file_entries_teamId_idx" ON "player_file_entries"("teamId");

-- CreateIndex
CREATE INDEX "player_file_entries_createdByUserId_idx" ON "player_file_entries"("createdByUserId");

-- CreateIndex
CREATE INDEX "player_file_entries_updatedByUserId_idx" ON "player_file_entries"("updatedByUserId");

-- AddForeignKey
ALTER TABLE "player_attribute_definitions" ADD CONSTRAINT "player_attribute_definitions_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_attribute_snapshots" ADD CONSTRAINT "player_attribute_snapshots_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_attribute_snapshots" ADD CONSTRAINT "player_attribute_snapshots_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_attribute_snapshots" ADD CONSTRAINT "player_attribute_snapshots_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_attribute_ratings" ADD CONSTRAINT "player_attribute_ratings_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "player_attribute_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_attribute_ratings" ADD CONSTRAINT "player_attribute_ratings_attributeDefinitionId_fkey" FOREIGN KEY ("attributeDefinitionId") REFERENCES "player_attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_training_performances" ADD CONSTRAINT "player_training_performances_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_training_performances" ADD CONSTRAINT "player_training_performances_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_training_performances" ADD CONSTRAINT "player_training_performances_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_form_snapshots" ADD CONSTRAINT "player_form_snapshots_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_form_snapshots" ADD CONSTRAINT "player_form_snapshots_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_file_entries" ADD CONSTRAINT "player_file_entries_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_file_entries" ADD CONSTRAINT "player_file_entries_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_file_entries" ADD CONSTRAINT "player_file_entries_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_file_entries" ADD CONSTRAINT "player_file_entries_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CheckConstraints
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_values_check" CHECK (
    "goals" >= 0
    AND "assists" >= 0
    AND "yellowCards" >= 0
    AND "redCards" >= 0
    AND "minutesPlayed" >= 0
    AND "minutesPlayed" <= 120
    AND ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 10))
);

ALTER TABLE "player_attribute_ratings" ADD CONSTRAINT "player_attribute_ratings_value_check" CHECK ("value" >= 1 AND "value" <= 20);

ALTER TABLE "player_training_performances" ADD CONSTRAINT "player_training_performances_rating_check" CHECK ("rating" >= 1 AND "rating" <= 10);

ALTER TABLE "player_form_snapshots" ADD CONSTRAINT "player_form_snapshots_value_check" CHECK ("value" >= 1 AND "value" <= 10);
