ALTER TABLE "bookings" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "charges" ADD COLUMN "payment_methods" jsonb DEFAULT '[]'::jsonb NOT NULL;