CREATE TYPE "public"."tour_category" AS ENUM('activity', 'accommodation', 'package');--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "category" "tour_category" DEFAULT 'activity' NOT NULL;