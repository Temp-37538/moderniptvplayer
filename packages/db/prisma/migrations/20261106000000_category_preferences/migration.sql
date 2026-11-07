-- CreateTable
CREATE TABLE "category_preference" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "playlistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_safety_preference" (
    "userId" TEXT NOT NULL,
    "lockAdultCategories" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_safety_preference_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "category_preference_userId_playlistId_kind_idx" ON "category_preference"("userId", "playlistId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "category_preference_userId_playlistId_kind_categoryId_key" ON "category_preference"("userId", "playlistId", "kind", "categoryId");

-- AddForeignKey
ALTER TABLE "category_preference" ADD CONSTRAINT "category_preference_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_preference" ADD CONSTRAINT "category_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_safety_preference" ADD CONSTRAINT "user_safety_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
