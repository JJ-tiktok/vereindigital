-- AlterTable
ALTER TABLE "tactics" ADD COLUMN "defenseFormation" TEXT NOT NULL DEFAULT '4-4-2';

-- AlterTable
ALTER TABLE "tactic_slots" ADD COLUMN "phase" "TacticPhase" NOT NULL DEFAULT 'OFFENSE';
