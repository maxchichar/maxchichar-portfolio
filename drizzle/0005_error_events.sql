CREATE TABLE "error_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fingerprint" text NOT NULL,
	"source" text NOT NULL,
	"message" text NOT NULL,
	"route" text,
	"last_path" text,
	"method" text,
	"digest" text,
	"stack" text,
	"count" integer DEFAULT 1 NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_alerted_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "error_events_fingerprint_unique" UNIQUE("fingerprint"),
	CONSTRAINT "error_events_source_check" CHECK ("error_events"."source" IN ('server','client'))
);
--> statement-breakpoint
CREATE INDEX "error_events_last_seen_idx" ON "error_events" USING btree ("last_seen");