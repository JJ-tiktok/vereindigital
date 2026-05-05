CREATE TABLE "training_exercise_sketches" (
    "id" TEXT NOT NULL,
    "trainingExerciseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pitchType" "TrainingPitchType" NOT NULL DEFAULT 'FREE_AREA',
    "sketchData" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_exercise_sketches_pkey" PRIMARY KEY ("id")
);

INSERT INTO "training_exercise_sketches" (
    "id",
    "trainingExerciseId",
    "title",
    "pitchType",
    "sketchData",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy_' || "id",
    "id",
    'Skizze 1',
    "pitchType",
    "sketchData",
    0,
    "createdAt",
    "updatedAt"
FROM "training_exercises"
WHERE "sketchData" IS NOT NULL;

CREATE UNIQUE INDEX "training_exercise_sketches_trainingExerciseId_sortOrder_key"
ON "training_exercise_sketches"("trainingExerciseId", "sortOrder");

CREATE INDEX "training_exercise_sketches_trainingExerciseId_idx"
ON "training_exercise_sketches"("trainingExerciseId");

ALTER TABLE "training_exercise_sketches"
ADD CONSTRAINT "training_exercise_sketches_trainingExerciseId_fkey"
FOREIGN KEY ("trainingExerciseId") REFERENCES "training_exercises"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
