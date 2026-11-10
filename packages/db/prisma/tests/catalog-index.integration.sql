-- Integration assertions for the persistent catalogue tables.
-- The caller must supply TEST_DATABASE_URL and run this only against the
-- disposable PostgreSQL service database after prisma migrate deploy.

BEGIN;

INSERT INTO "user" (
    "id", "name", "email", "emailVerified", "createdAt", "updatedAt"
) VALUES
    ('catalog-it-user-a', 'Catalog integration A', 'catalog-it-a@example.invalid', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('catalog-it-user-b', 'Catalog integration B', 'catalog-it-b@example.invalid', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "playlist" (
    "id", "source", "serverUrl", "username", "playlistName", "password",
    "identityKey", "userId", "createdAt", "updatedAt"
) VALUES
    ('catalog-it-playlist-a', 'XTREAM', 'https://provider-a.example', 'user-a', 'Integration A', 'not-a-real-secret-a', 'catalog-it-identity-a', 'catalog-it-user-a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('catalog-it-playlist-b', 'XTREAM', 'https://provider-b.example', 'user-b', 'Integration B', 'not-a-real-secret-b', 'catalog-it-identity-b', 'catalog-it-user-b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "catalog_sync" (
    "playlistId", "activeSyncId", "status", "itemCount", "createdAt", "updatedAt"
) VALUES
    ('catalog-it-playlist-a', 'generation-a-old', 'ready', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('catalog-it-playlist-b', 'generation-b-active', 'ready', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "catalog_entry" (
    "id", "playlistId", "syncId", "kind", "itemId", "name",
    "normalizedName", "categoryIds", "image"
) VALUES
    ('catalog-it-a-old', 'catalog-it-playlist-a', 'generation-a-old', 'movie', 'same-provider-item-id', 'Old generation', 'old generation', ARRAY['movies-a'], NULL),
    ('catalog-it-a-next', 'catalog-it-playlist-a', 'generation-a-next', 'movie', 'same-provider-item-id', 'New generation', 'new generation', ARRAY['movies-a'], NULL),
    ('catalog-it-b-active', 'catalog-it-playlist-b', 'generation-b-active', 'movie', 'same-provider-item-id', 'Other user title', 'other user title', ARRAY['movies-b'], NULL);

DO $$
DECLARE
    active_generation TEXT;
    active_rows INTEGER;
    active_name TEXT;
BEGIN
    -- The staging generation is present but invisible until the active pointer flips.
    SELECT "activeSyncId"
      INTO active_generation
      FROM "catalog_sync"
     WHERE "playlistId" = 'catalog-it-playlist-a';

    SELECT COUNT(*), MIN("name")
      INTO active_rows, active_name
      FROM "catalog_entry"
     WHERE "playlistId" = 'catalog-it-playlist-a'
       AND "syncId" = active_generation;

    IF active_rows <> 1 OR active_name <> 'Old generation' THEN
        RAISE EXCEPTION 'Active generation did not isolate the old snapshot';
    END IF;

    -- Equal provider item ids in another user's playlist must not cross scopes.
    IF NOT EXISTS (
        SELECT 1
          FROM "catalog_entry"
         WHERE "playlistId" = 'catalog-it-playlist-b'
           AND "syncId" = 'generation-b-active'
           AND "itemId" = 'same-provider-item-id'
           AND "name" = 'Other user title'
    ) THEN
        RAISE EXCEPTION 'Playlist-scoped lookup leaked across users';
    END IF;
END
$$;

-- Simulate the production cut-over transaction: point to the new generation,
-- then delete old generations without altering another playlist's snapshot.
UPDATE "catalog_sync"
   SET "activeSyncId" = 'generation-a-next',
       "status" = 'ready',
       "itemCount" = 1,
       "lastError" = NULL,
       "lockedUntil" = NULL,
       "syncedAt" = CURRENT_TIMESTAMP,
       "updatedAt" = CURRENT_TIMESTAMP
 WHERE "playlistId" = 'catalog-it-playlist-a';

DELETE FROM "catalog_entry"
 WHERE "playlistId" = 'catalog-it-playlist-a'
   AND "syncId" <> 'generation-a-next';

DO $$
DECLARE
    active_generation TEXT;
    active_rows INTEGER;
    active_name TEXT;
BEGIN
    SELECT "activeSyncId"
      INTO active_generation
      FROM "catalog_sync"
     WHERE "playlistId" = 'catalog-it-playlist-a';

    SELECT COUNT(*), MIN("name")
      INTO active_rows, active_name
      FROM "catalog_entry"
     WHERE "playlistId" = 'catalog-it-playlist-a'
       AND "syncId" = active_generation;

    IF active_rows <> 1 OR active_name <> 'New generation' THEN
        RAISE EXCEPTION 'Generation switch did not expose the complete new snapshot';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM "catalog_entry"
         WHERE "playlistId" = 'catalog-it-playlist-b'
           AND "syncId" = 'generation-b-active'
           AND "name" = 'Other user title'
    ) THEN
        RAISE EXCEPTION 'Generation cleanup modified another playlist';
    END IF;
END
$$;

-- The declared ON DELETE CASCADE relations must remove both index tables.
DELETE FROM "playlist" WHERE "id" = 'catalog-it-playlist-a';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "catalog_sync"
         WHERE "playlistId" = 'catalog-it-playlist-a'
    ) THEN
        RAISE EXCEPTION 'Deleting a playlist did not cascade to catalog_sync';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "catalog_entry"
         WHERE "playlistId" = 'catalog-it-playlist-a'
    ) THEN
        RAISE EXCEPTION 'Deleting a playlist did not cascade to catalog_entry';
    END IF;
END
$$;

ROLLBACK;
