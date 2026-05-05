-- CreateEnum
CREATE TYPE "TrainingExerciseVisibility" AS ENUM ('TEAM', 'CLUB');

-- CreateEnum
CREATE TYPE "TrainingPitchType" AS ENUM ('FULL_FIELD', 'HALF_FIELD', 'PENALTY_AREA', 'SMALL_FIELD', 'FREE_AREA');

-- AlterTable
ALTER TABLE "training_exercises"
ADD COLUMN "teamId" TEXT,
ADD COLUMN "objective" TEXT,
ADD COLUMN "organization" TEXT,
ADD COLUMN "flow" TEXT,
ADD COLUMN "coachingPoints" TEXT,
ADD COLUMN "variations" TEXT,
ADD COLUMN "material" TEXT,
ADD COLUMN "visibility" "TrainingExerciseVisibility" NOT NULL DEFAULT 'TEAM',
ADD COLUMN "pitchType" "TrainingPitchType" NOT NULL DEFAULT 'FREE_AREA',
ADD COLUMN "sketchData" JSONB;

-- CreateIndex
CREATE INDEX "training_exercises_teamId_idx" ON "training_exercises"("teamId");

-- CreateIndex
CREATE INDEX "training_exercises_category_idx" ON "training_exercises"("category");

-- CreateIndex
CREATE INDEX "training_exercises_visibility_idx" ON "training_exercises"("visibility");

-- AddForeignKey
ALTER TABLE "training_exercises" ADD CONSTRAINT "training_exercises_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
