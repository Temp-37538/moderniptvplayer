-- Persist an M3U playlist on the same playlist row used by Xtream.
-- Existing rows stay XTREAM. identityKey keeps the previous
-- (user, server URL, username) uniqueness, and favorites, watch later,
-- watch progress, and category preferences keep the same playlist id.

CREATE TYPE "PlaylistSource" AS ENUM ('XTREAM', 'M3U');

ALTER TABLE "playlist" ADD COLUMN "source" "PlaylistSource" NOT NULL DEFAULT 'XTREAM';
ALTER TABLE "playlist" ADD COLUMN "m3uUrl" TEXT;
ALTER TABLE "playlist" ADD COLUMN "identityKey" TEXT;

UPDATE "playlist"
SET "identityKey" = "serverUrl" || chr(10) || "username"
WHERE "identityKey" IS NULL;

ALTER TABLE "playlist" ALTER COLUMN "identityKey" SET NOT NULL;

CREATE UNIQUE INDEX "playlist_userId_identityKey_key" ON "playlist"("userId", "identityKey");
