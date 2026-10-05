CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"phone" text NOT NULL,
	"email" text,
	"address" text,
	"website" text,
	"booking_system" text,
	"booking_system_ref" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stay_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"tour_id" uuid NOT NULL,
	"partner_id" uuid,
	"status" text DEFAULT 'requested' NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"nights" integer NOT NULL,
	"rooms" jsonb NOT NULL,
	"guests" integer NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"notes" text,
	"base_amount" integer NOT NULL,
	"charges_breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_amount" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"partner_token" text NOT NULL,
	"partner_responded_at" timestamp with time zone,
	"escalated_at" timestamp with time zone,
	"decline_reason" text,
	"payment_link_id" text,
	"payment_link_url" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stay_bookings_ref_unique" UNIQUE("ref"),
	CONSTRAINT "stay_bookings_partner_token_unique" UNIQUE("partner_token")
);
--> statement-breakpoint
CREATE TABLE "stay_room_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"max_guests" integer DEFAULT 2 NOT NULL,
	"price_per_night" integer NOT NULL,
	"weekend_price_per_night" integer,
	"units" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "partner_id" uuid;--> statement-breakpoint
ALTER TABLE "stay_bookings" ADD CONSTRAINT "stay_bookings_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_bookings" ADD CONSTRAINT "stay_bookings_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_room_types" ADD CONSTRAINT "stay_room_types_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stay_bookings_tour_idx" ON "stay_bookings" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "stay_bookings_status_idx" ON "stay_bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stay_room_types_tour_idx" ON "stay_room_types" USING btree ("tour_id");--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;