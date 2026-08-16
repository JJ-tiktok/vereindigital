-- CreateEnum
CREATE TYPE "MatchNoteCategory" AS ENUM ('OWN_TEAM', 'OPPONENT', 'GENERAL');

-- CreateTable
CREATE TABLE "match_notes" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "category" "MatchNoteCategory" NOT NULL,
    "body" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_notes_matchId_category_createdAt_idx" ON "match_notes"("matchId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "match_notes_createdByUserId_idx" ON "match_notes"("createdByUserId");

-- AddForeignKey
ALTER TABLE "match_notes" ADD CONSTRAINT "match_notes_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_notes" ADD CONSTRAINT "match_notes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
