-- CreateEnum
CREATE TYPE "ScoutingStatus" AS ENUM ('WATCHING', 'CONTACTED', 'TRIAL', 'OFFER_MADE', 'SIGNED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ScoutingEventType" AS ENUM ('PHONE_CALL', 'MATCH_OBSERVED', 'TRAINING_TRIAL', 'MEETING', 'VIDEO_REVIEW', 'OTHER');

-- CreateTable
CREATE TABLE "scouting_prospects" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "position" TEXT,
    "currentClub" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "source" TEXT,
    "interestLevel" INTEGER,
    "status" "ScoutingStatus" NOT NULL DEFAULT 'WATCHING',
    "notes" TEXT,
    "convertedPlayerProfileId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scouting_prospects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scouting_events" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "type" "ScoutingEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "followUpAt" TIMESTAMP(3),
    "calendarEventId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scouting_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scouting_attribute_snapshots" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "ratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scouting_attribute_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scouting_attribute_ratings" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "attributeDefinitionId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "scouting_attribute_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scouting_prospects_convertedPlayerProfileId_key" ON "scouting_prospects"("convertedPlayerProfileId");

-- CreateIndex
CREATE INDEX "scouting_prospects_clubId_status_idx" ON "scouting_prospects"("clubId", "status");

-- CreateIndex
CREATE INDEX "scouting_events_prospectId_occurredAt_idx" ON "scouting_events"("prospectId", "occurredAt");

-- CreateIndex
CREATE INDEX "scouting_events_calendarEventId_idx" ON "scouting_events"("calendarEventId");

-- CreateIndex
CREATE INDEX "scouting_attribute_snapshots_prospectId_ratedAt_idx" ON "scouting_attribute_snapshots"("prospectId", "ratedAt");

-- CreateIndex
CREATE INDEX "scouting_attribute_ratings_attributeDefinitionId_idx" ON "scouting_attribute_ratings"("attributeDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "scouting_attribute_ratings_snapshotId_attributeDefinitionId_key" ON "scouting_attribute_ratings"("snapshotId", "attributeDefinitionId");

-- AddForeignKey
ALTER TABLE "scouting_prospects" ADD CONSTRAINT "scouting_prospects_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_prospects" ADD CONSTRAINT "scouting_prospects_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_prospects" ADD CONSTRAINT "scouting_prospects_convertedPlayerProfileId_fkey" FOREIGN KEY ("convertedPlayerProfileId") REFERENCES "player_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_events" ADD CONSTRAINT "scouting_events_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "scouting_prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_events" ADD CONSTRAINT "scouting_events_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_events" ADD CONSTRAINT "scouting_events_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_events" ADD CONSTRAINT "scouting_events_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_attribute_snapshots" ADD CONSTRAINT "scouting_attribute_snapshots_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "scouting_prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_attribute_snapshots" ADD CONSTRAINT "scouting_attribute_snapshots_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_attribute_ratings" ADD CONSTRAINT "scouting_attribute_ratings_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "scouting_attribute_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_attribute_ratings" ADD CONSTRAINT "scouting_attribute_ratings_attributeDefinitionId_fkey" FOREIGN KEY ("attributeDefinitionId") REFERENCES "player_attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
