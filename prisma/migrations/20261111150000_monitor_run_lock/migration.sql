-- Lock so a user's "Run all now" can't start while one is already running.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "monitorRunStartedAt" TIMESTAMP(3);
