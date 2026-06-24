ALTER TABLE "tours" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "details" jsonb DEFAULT '{}'::jsonb NOT NULL;