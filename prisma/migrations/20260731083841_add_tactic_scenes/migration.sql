-- CreateEnum
CREATE TYPE "TacticSceneCategory" AS ENUM ('STANDARDS', 'DEFENSE', 'ATTACK', 'MATCH_SCENE', 'CUSTOM');

-- CreateTable
CREATE TABLE "tactic_scenes" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "TacticSceneCategory" NOT NULL DEFAULT 'CUSTOM',
    "pitchType" "TrainingPitchType" NOT NULL DEFAULT 'FULL_FIELD',
    "description" TEXT,
    "defaultStepDurationMs" INTEGER NOT NULL DEFAULT 1500,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tactic_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tactic_scene_steps" (
    "id" TEXT NOT NULL,
    "tacticSceneId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,
    "elementsData" JSONB NOT NULL,
    "transitionMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tactic_scene_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tactic_scenes_clubId_idx" ON "tactic_scenes"("clubId");

-- CreateIndex
CREATE INDEX "tactic_scenes_teamId_idx" ON "tactic_scenes"("teamId");

-- CreateIndex
CREATE INDEX "tactic_scenes_category_idx" ON "tactic_scenes"("category");

-- CreateIndex
CREATE INDEX "tactic_scene_steps_tacticSceneId_idx" ON "tactic_scene_steps"("tacticSceneId");

-- CreateIndex
CREATE UNIQUE INDEX "tactic_scene_steps_tacticSceneId_sortOrder_key" ON "tactic_scene_steps"("tacticSceneId", "sortOrder");

-- AddForeignKey
ALTER TABLE "tactic_scenes" ADD CONSTRAINT "tactic_scenes_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tactic_scenes" ADD CONSTRAINT "tactic_scenes_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tactic_scenes" ADD CONSTRAINT "tactic_scenes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tactic_scene_steps" ADD CONSTRAINT "tactic_scene_steps_tacticSceneId_fkey" FOREIGN KEY ("tacticSceneId") REFERENCES "tactic_scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
