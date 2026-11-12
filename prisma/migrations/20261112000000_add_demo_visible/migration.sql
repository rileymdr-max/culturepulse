-- Add demoVisible flag to Subculture
-- Admin can hide specific approved subcultures from demo sessions.
-- Defaults to true so existing entries remain visible in demo.

ALTER TABLE "Subculture" ADD COLUMN "demoVisible" BOOLEAN NOT NULL DEFAULT true;
