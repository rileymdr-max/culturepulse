-- Brand Audits count per brand: store which brand each audit was for.
ALTER TABLE "UsageEvent" ADD COLUMN IF NOT EXISTS "subject" TEXT;
