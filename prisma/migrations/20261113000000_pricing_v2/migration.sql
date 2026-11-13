-- Pricing v2: Snapshot credits on users, library picks, and a usage log for
-- monthly limits. Written to be safe to re-run.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "snapshotCredits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bonusLibraryPicks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "snapshotPurchasedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "snapshotCreditUsedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "LibraryPick" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subcultureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibraryPick_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LibraryPick_userId_subcultureId_key" ON "LibraryPick"("userId", "subcultureId");
CREATE INDEX IF NOT EXISTS "LibraryPick_userId_idx" ON "LibraryPick"("userId");

CREATE TABLE IF NOT EXISTS "UsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UsageEvent_userId_kind_createdAt_idx" ON "UsageEvent"("userId", "kind", "createdAt");

DO $$ BEGIN
  ALTER TABLE "LibraryPick" ADD CONSTRAINT "LibraryPick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LibraryPick" ADD CONSTRAINT "LibraryPick_subcultureId_fkey" FOREIGN KEY ("subcultureId") REFERENCES "Subculture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
