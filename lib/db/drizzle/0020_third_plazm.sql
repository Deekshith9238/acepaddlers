CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_ref" text NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"email" text NOT NULL,
	"phone" text,
	"city" text,
	"status" text DEFAULT 'invited' NOT NULL,
	"commission_percent" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"invited_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agents_agent_ref_unique" UNIQUE("agent_ref")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "agent_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "agents_email_unique" ON "agents" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "agents_status_idx" ON "agents" USING btree ("status");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;