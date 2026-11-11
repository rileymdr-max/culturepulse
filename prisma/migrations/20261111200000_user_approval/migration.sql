-- New sign-ups wait for admin approval before they can sign in.
ALTER TABLE "User" ADD COLUMN "approvedAt" TIMESTAMP(3);

-- Everyone who already has an account stays approved.
UPDATE "User" SET "approvedAt" = "createdAt";
