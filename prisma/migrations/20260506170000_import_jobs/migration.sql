CREATE TYPE "ImportType" AS ENUM ('ROSTER', 'MATCH_STATS');

CREATE TYPE "ImportSourceType" AS ENUM ('TEMPLATE_CSV', 'AI_URL');

CREATE TYPE "ImportStatus" AS ENUM ('DRAFT', 'PARSED', 'CONFIRMED', 'FAILED');

CREATE TABLE "import_jobs" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "type" "ImportType" NOT NULL,
  "sourceType" "ImportSourceType" NOT NULL,
  "status" "ImportStatus" NOT NULL DEFAULT 'DRAFT',
  "sourceUrl" TEXT,
  "fileName" TEXT,
  "parsedData" JSONB,
  "issues" JSONB,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "import_jobs_clubId_createdAt_idx" ON "import_jobs"("clubId", "createdAt");
CREATE INDEX "import_jobs_teamId_type_status_idx" ON "import_jobs"("teamId", "type", "status");
CREATE INDEX "import_jobs_seasonId_idx" ON "import_jobs"("seasonId");
CREATE INDEX "import_jobs_createdByUserId_idx" ON "import_jobs"("createdByUserId");

ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
