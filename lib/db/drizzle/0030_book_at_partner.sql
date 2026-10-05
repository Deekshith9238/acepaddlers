ALTER TABLE "partners" ADD COLUMN "booking_url" text;--> statement-breakpoint
ALTER TABLE "stay_bookings" ADD COLUMN "partner_booking_ref" text;--> statement-breakpoint
ALTER TABLE "stay_bookings" ADD COLUMN "partner_booked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stay_bookings" ADD COLUMN "autofill_code" text;--> statement-breakpoint
ALTER TABLE "stay_bookings" ADD COLUMN "autofill_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stay_bookings" ADD CONSTRAINT "stay_bookings_autofill_code_unique" UNIQUE("autofill_code");