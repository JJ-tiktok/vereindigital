-- CreateTable
CREATE TABLE "feedback_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedbackItemId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_notifications_userId_readAt_idx" ON "feedback_notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "feedback_notifications_feedbackItemId_idx" ON "feedback_notifications"("feedbackItemId");

-- AddForeignKey
ALTER TABLE "feedback_notifications" ADD CONSTRAINT "feedback_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_notifications" ADD CONSTRAINT "feedback_notifications_feedbackItemId_fkey" FOREIGN KEY ("feedbackItemId") REFERENCES "feedback_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
