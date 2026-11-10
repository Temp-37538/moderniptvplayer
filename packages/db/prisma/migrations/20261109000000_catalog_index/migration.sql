-- Persist a playlist-scoped snapshot of channels, movies, and series.
-- Stream URLs and provider credentials are intentionally not stored.

CREATE TABLE "catalog_sync" (
    "playlistId" TEXT NOT NULL,
    "activeSyncId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "syncedAt" TIMESTAMP(3),
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "lockToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_sync_pkey" PRIMARY KEY ("playlistId")
);

CREATE TABLE "catalog_entry" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "syncId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "categoryIds" TEXT[] NOT NULL,
    "image" TEXT,

    CONSTRAINT "catalog_entry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catalog_entry_playlistId_syncId_kind_itemId_key"
    ON "catalog_entry"("playlistId", "syncId", "kind", "itemId");

CREATE INDEX "catalog_entry_playlistId_syncId_idx"
    ON "catalog_entry"("playlistId", "syncId");

ALTER TABLE "catalog_sync"
    ADD CONSTRAINT "catalog_sync_playlistId_fkey"
    FOREIGN KEY ("playlistId") REFERENCES "playlist"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "catalog_entry"
    ADD CONSTRAINT "catalog_entry_playlistId_fkey"
    FOREIGN KEY ("playlistId") REFERENCES "playlist"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
