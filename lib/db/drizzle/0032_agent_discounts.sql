CREATE TABLE "agent_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"paid_on" date NOT NULL,
	"method" text,
	"reference" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "agent_earning" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "agent_id" uuid;--> statement-breakpoint
ALTER TABLE "agent_payouts" ADD CONSTRAINT "agent_payouts_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_payouts_agent_idx" ON "agent_payouts" USING btree ("agent_id");--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;