ALTER TABLE "reviews" ALTER COLUMN "tour_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "moderated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "author_photo_url" text;--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_external_id_idx" ON "reviews" USING btree ("external_id");--> statement-breakpoint
-- Every review written before the queue existed was put there by the team, so
-- it counts as decided; only imports arriving from now on wait for approval.
UPDATE "reviews" SET "moderated_at" = "created_at" WHERE "moderated_at" IS NULL;