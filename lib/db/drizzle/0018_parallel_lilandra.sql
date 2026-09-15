CREATE TABLE "tour_booking_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"help" text,
	"field_type" text DEFAULT 'text' NOT NULL,
	"options" text[] DEFAULT '{}' NOT NULL,
	"applies_to" text DEFAULT 'booking' NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_booking_fields_key_unique" UNIQUE("tour_id","key")
);
--> statement-breakpoint
CREATE TABLE "tour_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"seats_per_guest" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_variants_code_unique" UNIQUE("tour_id","code")
);
--> statement-breakpoint
ALTER TABLE "tour_slots" DROP CONSTRAINT "tour_slots_unique";--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "shared_trip" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "min_participants" integer;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "max_participants" integer;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "terms" text;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "advertised_price" integer;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "price_label_position" text DEFAULT 'before' NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "show_advertised_price" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "allow_partial_deposit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "deposit_percent" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "seat_sharing" text DEFAULT 'independent' NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "departure_display" text DEFAULT 'calendar' NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "show_seats_available" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "show_seats_booked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "show_guaranteed_departure" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "show_seats_to_guarantee" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "booking_lead_time_hours" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "payment_deadline_days" integer;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "itinerary" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "itinerary_text" text;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "latitude" text;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "longitude" text;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "short_address" text;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "detailed_address" text;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "directions" text;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "confirmation_email_intro" text;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "labels" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "related_tour_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "og_title" text;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "og_description" text;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "og_image" text;--> statement-breakpoint
ALTER TABLE "tour_addons" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "tour_participant_types" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "tour_slots" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "extra_fields" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tour_booking_fields" ADD CONSTRAINT "tour_booking_fields_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_variants" ADD CONSTRAINT "tour_variants_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tour_booking_fields_tour_idx" ON "tour_booking_fields" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "tour_variants_tour_idx" ON "tour_variants" USING btree ("tour_id");--> statement-breakpoint
ALTER TABLE "tour_addons" ADD CONSTRAINT "tour_addons_variant_id_tour_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."tour_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_participant_types" ADD CONSTRAINT "tour_participant_types_variant_id_tour_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."tour_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_variant_id_tour_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."tour_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_slots" ADD CONSTRAINT "tour_slots_variant_id_tour_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."tour_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_variant_id_tour_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."tour_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_slots" ADD CONSTRAINT "tour_slots_unique" UNIQUE NULLS NOT DISTINCT("tour_id","variant_id","date","start_time");