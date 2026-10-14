-- A playlist is unique per user, server and username (it used to be unique
-- across all users on serverUrl alone).

-- DropIndex
DROP INDEX IF EXISTS "playlist_serverUrl_key";

-- CreateIndex
CREATE UNIQUE INDEX "playlist_userId_serverUrl_username_key" ON "playlist"("userId", "serverUrl", "username");
