-- Lock so a user's "Run all now" can't start while one is already running.
ALTER TABLE "User" ADD COLUMN "monitorRunStartedAt" TIMESTAMP(3);
