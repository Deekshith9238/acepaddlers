ALTER TYPE "public"."booking_status" ADD VALUE 'cart_abandoned';--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "internal_notes" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "kind" text DEFAULT 'payment' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "method" text DEFAULT 'razorpay' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "received_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "recorded_by" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "notes" text;