CREATE TABLE "stay_calendar_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_type_id" uuid NOT NULL,
	"start" date NOT NULL,
	"end" date NOT NULL,
	"summary" text
);
--> statement-breakpoint
ALTER TABLE "stay_room_types" ADD COLUMN "ical_url" text;--> statement-breakpoint
ALTER TABLE "stay_room_types" ADD COLUMN "ical_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stay_room_types" ADD COLUMN "ical_error" text;--> statement-breakpoint
ALTER TABLE "stay_calendar_blocks" ADD CONSTRAINT "stay_calendar_blocks_room_type_id_stay_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."stay_room_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stay_calendar_blocks_room_idx" ON "stay_calendar_blocks" USING btree ("room_type_id");