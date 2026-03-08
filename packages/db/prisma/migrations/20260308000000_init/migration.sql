-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist" (
    "id" TEXT NOT NULL,
    "serverUrl" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "playlistName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_later" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemUrl" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watch_later_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemUrl" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "playlist_serverUrl_key" ON "playlist"("serverUrl");

-- CreateIndex
CREATE INDEX "playlist_userId_idx" ON "playlist"("userId");

-- CreateIndex
CREATE INDEX "watch_later_playlistId_idx" ON "watch_later"("playlistId");

-- CreateIndex
CREATE INDEX "watch_later_userId_idx" ON "watch_later"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "watch_later_playlistId_itemId_itemType_key" ON "watch_later"("playlistId", "itemId", "itemType");

-- CreateIndex
CREATE INDEX "favorite_playlistId_idx" ON "favorite"("playlistId");

-- CreateIndex
CREATE INDEX "favorite_userId_idx" ON "favorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_playlistId_itemId_itemType_key" ON "favorite"("playlistId", "itemId", "itemType");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- AddForeignKey
ALTER TABLE "playlist" ADD CONSTRAINT "playlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_later" ADD CONSTRAINT "watch_later_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_later" ADD CONSTRAINT "watch_later_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;