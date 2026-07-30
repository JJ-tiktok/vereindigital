-- CreateEnum
CREATE TYPE "MatchCompetition" AS ENUM ('LEAGUE', 'CUP', 'FRIENDLY', 'OTHER');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "competition" "MatchCompetition" NOT NULL DEFAULT 'LEAGUE';
