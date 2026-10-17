ALTER TYPE "public"."admin_role" ADD VALUE 'owner' BEFORE 'admin';--> statement-breakpoint
ALTER TYPE "public"."admin_role" ADD VALUE 'manager' BEFORE 'editor';--> statement-breakpoint
ALTER TYPE "public"."admin_role" ADD VALUE 'finance' BEFORE 'editor';--> statement-breakpoint
ALTER TYPE "public"."admin_role" ADD VALUE 'viewer';--> statement-breakpoint
CREATE TABLE "charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"type" text DEFAULT 'percent' NOT NULL,
	"value" integer NOT NULL,
	"tour_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"last_hit_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "redirects_from_path_unique" ON "redirects" USING btree ("from_path");