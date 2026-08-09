-- CreateEnum
CREATE TYPE "PlayerFileEntryVisibility" AS ENUM ('INTERNAL', 'PLAYER');

-- AlterTable
ALTER TABLE "player_file_entries" ADD COLUMN     "visibility" "PlayerFileEntryVisibility" NOT NULL DEFAULT 'INTERNAL';

-- CreateIndex
CREATE INDEX "player_file_entries_playerProfileId_visibility_idx" ON "player_file_entries"("playerProfileId", "visibility");
