-- Data-only migration: monitors created before all-platform support were
-- saved with the old default ['reddit','twitter']. Move them to all six
-- platforms so runs keep TikTok, YouTube, Instagram and Google Trends results.
-- Monitors with any other platform list are left alone.
UPDATE "Monitor"
SET "platforms" = ARRAY['reddit', 'twitter', 'tiktok', 'youtube', 'instagram', 'trends']::TEXT[],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "platforms" @> ARRAY['reddit', 'twitter']::TEXT[]
  AND cardinality("platforms") = 2;
