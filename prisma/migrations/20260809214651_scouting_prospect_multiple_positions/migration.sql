-- AlterTable
ALTER TABLE "scouting_prospects" ADD COLUMN     "positions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing single position values into the new array column
UPDATE "scouting_prospects" SET "positions" = ARRAY["position"] WHERE "position" IS NOT NULL AND "position" <> '';

-- AlterTable
ALTER TABLE "scouting_prospects" DROP COLUMN "position";
