-- CreateEnum
CREATE TYPE "TacticDuty" AS ENUM ('DEFENSIVE', 'BALANCED', 'OFFENSIVE');

-- CreateEnum
CREATE TYPE "TacticPhase" AS ENUM ('OFFENSE', 'DEFENSE');

-- CreateTable
CREATE TABLE "tactics" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formation" TEXT NOT NULL,
    "styleValue" INTEGER NOT NULL DEFAULT 2,
    "lineValue" INTEGER NOT NULL DEFAULT 2,
    "pressingValue" INTEGER NOT NULL DEFAULT 2,
    "widthValue" INTEGER NOT NULL DEFAULT 2,
    "tempoValue" INTEGER NOT NULL DEFAULT 2,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tactics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tactic_slots" (
    "id" TEXT NOT NULL,
    "tacticId" TEXT NOT NULL,
    "positionCode" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "role" TEXT NOT NULL,
    "duty" "TacticDuty" NOT NULL DEFAULT 'BALANCED',
    "playerProfileId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tactic_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tactic_arrows" (
    "id" TEXT NOT NULL,
    "tacticId" TEXT NOT NULL,
    "phase" "TacticPhase" NOT NULL,
    "x1" DOUBLE PRECISION NOT NULL,
    "y1" DOUBLE PRECISION NOT NULL,
    "x2" DOUBLE PRECISION NOT NULL,
    "y2" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tactic_arrows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tactics_clubId_idx" ON "tactics"("clubId");

-- CreateIndex
CREATE INDEX "tactics_teamId_idx" ON "tactics"("teamId");

-- CreateIndex
CREATE INDEX "tactic_slots_tacticId_idx" ON "tactic_slots"("tacticId");

-- CreateIndex
CREATE INDEX "tactic_slots_playerProfileId_idx" ON "tactic_slots"("playerProfileId");

-- CreateIndex
CREATE INDEX "tactic_arrows_tacticId_idx" ON "tactic_arrows"("tacticId");

-- AddForeignKey
ALTER TABLE "tactics" ADD CONSTRAINT "tactics_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tactics" ADD CONSTRAINT "tactics_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tactics" ADD CONSTRAINT "tactics_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tactic_slots" ADD CONSTRAINT "tactic_slots_tacticId_fkey" FOREIGN KEY ("tacticId") REFERENCES "tactics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tactic_slots" ADD CONSTRAINT "tactic_slots_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "player_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tactic_arrows" ADD CONSTRAINT "tactic_arrows_tacticId_fkey" FOREIGN KEY ("tacticId") REFERENCES "tactics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
