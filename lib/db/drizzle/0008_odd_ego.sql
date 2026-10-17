CREATE TABLE "wa_sessions" (
	"phone" text PRIMARY KEY NOT NULL,
	"state" text DEFAULT 'menu' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
