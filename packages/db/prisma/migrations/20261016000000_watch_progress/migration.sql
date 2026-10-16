-- CreateTable
CREATE TABLE "watch_progress" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemUrl" TEXT NOT NULL,
    "itemImage" TEXT,
    "showId" TEXT,
    "positionSec" INTEGER NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "playlistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watch_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watch_progress_playlistId_idx" ON "watch_progress"("playlistId");

-- CreateIndex
CREATE INDEX "watch_progress_userId_updatedAt_idx" ON "watch_progress"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "watch_progress_playlistId_itemId_itemType_key" ON "watch_progress"("playlistId", "itemId", "itemType");

-- AddForeignKey
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
