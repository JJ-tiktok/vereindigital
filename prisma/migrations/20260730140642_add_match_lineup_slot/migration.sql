-- CreateTable
CREATE TABLE "match_lineup_slots" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "positionCode" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "playerProfileId" TEXT,

    CONSTRAINT "match_lineup_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_lineup_slots_matchId_idx" ON "match_lineup_slots"("matchId");

-- CreateIndex
CREATE INDEX "match_lineup_slots_playerProfileId_idx" ON "match_lineup_slots"("playerProfileId");

-- AddForeignKey
ALTER TABLE "match_lineup_slots" ADD CONSTRAINT "match_lineup_slots_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineup_slots" ADD CONSTRAINT "match_lineup_slots_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "player_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
