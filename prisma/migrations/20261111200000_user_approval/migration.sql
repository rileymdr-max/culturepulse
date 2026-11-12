-- New sign-ups wait for admin approval before they can sign in.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

-- Everyone who already has an account stays approved (only sets NULL rows so re-runs don't overwrite real approvals).
UPDATE "User" SET "approvedAt" = "createdAt" WHERE "approvedAt" IS NULL;
