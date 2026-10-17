CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"path" text NOT NULL,
	"referrer" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"session_id" text NOT NULL,
	"tour_id" uuid,
	"destination_id" uuid,
	"value" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"report_key" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cadence" text DEFAULT 'daily' NOT NULL,
	"send_hour" integer DEFAULT 7 NOT NULL,
	"recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_sent_on" date,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "analytics_events_created_idx" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_type_idx" ON "analytics_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "analytics_events_tour_idx" ON "analytics_events" USING btree ("tour_id");