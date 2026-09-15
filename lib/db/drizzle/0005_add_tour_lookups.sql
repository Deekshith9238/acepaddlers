-- Admin-manageable tour types/categories, replacing the fixed tour_type /
-- tour_category enums. Order matters: the lookup tables are created and
-- seeded with the current enum values BEFORE tours.type/category are
-- converted and FK'd to them, so existing tour rows always have a matching
-- lookup row when the foreign key constraint is added.

CREATE TABLE "tour_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tour_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
INSERT INTO "tour_types" ("slug", "label", "sort_order") VALUES
	('rafting', 'Rafting', 0),
	('camping', 'Camping', 1),
	('homestay', 'Homestay', 2),
	('water_sports', 'Water Sports', 3)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
INSERT INTO "tour_categories" ("slug", "label", "sort_order") VALUES
	('activity', 'Activity', 0),
	('accommodation', 'Accommodation', 1),
	('package', 'Package', 2)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "tours" ALTER COLUMN "type" SET DATA TYPE text USING "type"::text;--> statement-breakpoint
ALTER TABLE "tours" ALTER COLUMN "category" SET DATA TYPE text USING "category"::text;--> statement-breakpoint
ALTER TABLE "tours" ALTER COLUMN "category" SET DEFAULT 'activity';--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_type_tour_types_slug_fk" FOREIGN KEY ("type") REFERENCES "public"."tour_types"("slug") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_category_tour_categories_slug_fk" FOREIGN KEY ("category") REFERENCES "public"."tour_categories"("slug") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
DROP TYPE "public"."tour_category";--> statement-breakpoint
DROP TYPE "public"."tour_type";
