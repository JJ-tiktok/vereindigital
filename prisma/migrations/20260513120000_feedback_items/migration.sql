CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'FEATURE_REQUEST', 'IMPROVEMENT', 'OTHER');

CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'TRIAGED', 'IN_PROGRESS', 'DONE', 'WONT_DO');

CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "feedback_items" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "teamId" TEXT,
  "seasonId" TEXT,
  "createdByUserId" TEXT,
  "type" "FeedbackType" NOT NULL,
  "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
  "priority" "FeedbackPriority" NOT NULL DEFAULT 'MEDIUM',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "route" TEXT,
  "userAgent" TEXT,
  "viewportWidth" INTEGER,
  "viewportHeight" INTEGER,
  "screenshotData" TEXT,
  "context" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "feedback_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feedback_items_clubId_status_createdAt_idx" ON "feedback_items"("clubId", "status", "createdAt");
CREATE INDEX "feedback_items_teamId_idx" ON "feedback_items"("teamId");
CREATE INDEX "feedback_items_seasonId_idx" ON "feedback_items"("seasonId");
CREATE INDEX "feedback_items_createdByUserId_idx" ON "feedback_items"("createdByUserId");

ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
