-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "tacticId" TEXT;

-- CreateIndex
CREATE INDEX "matches_tacticId_idx" ON "matches"("tacticId");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_tacticId_fkey" FOREIGN KEY ("tacticId") REFERENCES "tactics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
