CREATE TABLE "tour_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"price_type" text DEFAULT 'per_unit' NOT NULL,
	"min_qty" integer DEFAULT 0 NOT NULL,
	"max_qty" integer,
	"required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_participant_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"min_age" integer,
	"max_age" integer,
	"occupies_seat" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_price_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"participant_type_id" uuid,
	"min_guests" integer NOT NULL,
	"max_guests" integer,
	"price" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "participant_breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "addons_breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tour_addons" ADD CONSTRAINT "tour_addons_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_participant_types" ADD CONSTRAINT "tour_participant_types_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_price_tiers" ADD CONSTRAINT "tour_price_tiers_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_price_tiers" ADD CONSTRAINT "tour_price_tiers_participant_type_id_tour_participant_types_id_fk" FOREIGN KEY ("participant_type_id") REFERENCES "public"."tour_participant_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tour_addons_tour_idx" ON "tour_addons" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "tour_participant_types_tour_idx" ON "tour_participant_types" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "tour_price_tiers_tour_idx" ON "tour_price_tiers" USING btree ("tour_id");