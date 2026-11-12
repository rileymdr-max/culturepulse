-- Demo curation: allow admin to flag which monitors, briefs, and audit runs
-- appear when the demo account is synced.
ALTER TABLE "Monitor"      ADD COLUMN IF NOT EXISTS "demoVisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContentBrief" ADD COLUMN IF NOT EXISTS "demoVisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AuditLog"     ADD COLUMN IF NOT EXISTS "demoVisible" BOOLEAN NOT NULL DEFAULT false;
