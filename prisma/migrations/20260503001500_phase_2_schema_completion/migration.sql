-- CreateTable
CREATE TABLE "club_memberships" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" "TeamMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "club_memberships_userId_idx" ON "club_memberships"("userId");

-- CreateIndex
CREATE INDEX "club_memberships_roleId_idx" ON "club_memberships"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "club_memberships_clubId_userId_roleId_key" ON "club_memberships"("clubId", "userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "team_memberships_teamId_userId_roleId_key" ON "team_memberships"("teamId", "userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "team_memberships_teamId_playerProfileId_roleId_key" ON "team_memberships"("teamId", "playerProfileId", "roleId");

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraints
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_subject_check" CHECK ("userId" IS NOT NULL OR "playerProfileId" IS NOT NULL);

ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_time_range_check" CHECK ("endsAt" > "startsAt");

ALTER TABLE "event_attendances" ADD CONSTRAINT "event_attendances_declined_reason_check" CHECK (
    "status" <> 'DECLINED' OR ("reason" IS NOT NULL AND length(btrim("reason")) > 0)
);

ALTER TABLE "player_availabilities" ADD CONSTRAINT "player_availabilities_time_range_check" CHECK ("endsAt" >= "startsAt");

ALTER TABLE "matches" ADD CONSTRAINT "matches_score_non_negative_check" CHECK (
    ("goalsFor" IS NULL OR "goalsFor" >= 0) AND ("goalsAgainst" IS NULL OR "goalsAgainst" >= 0)
);

ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_values_check" CHECK (
    "goals" >= 0
    AND "assists" >= 0
    AND "yellowCards" >= 0
    AND "redCards" >= 0
    AND "minutesPlayed" >= 0
    AND "minutesPlayed" <= 120
    AND ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 10))
);

ALTER TABLE "training_exercises" ADD CONSTRAINT "training_exercises_values_check" CHECK (
    ("durationMinutes" IS NULL OR "durationMinutes" > 0)
    AND ("minPlayers" IS NULL OR "minPlayers" > 0)
    AND ("maxPlayers" IS NULL OR "maxPlayers" > 0)
    AND ("minPlayers" IS NULL OR "maxPlayers" IS NULL OR "maxPlayers" >= "minPlayers")
);

ALTER TABLE "training_plan_exercises" ADD CONSTRAINT "training_plan_exercises_values_check" CHECK (
    "sortOrder" >= 0
    AND ("durationMinutes" IS NULL OR "durationMinutes" > 0)
);
