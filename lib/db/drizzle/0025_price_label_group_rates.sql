ALTER TABLE "tours" ADD COLUMN "price_label" text;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "show_group_rates" boolean DEFAULT false NOT NULL;