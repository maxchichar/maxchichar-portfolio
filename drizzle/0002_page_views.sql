CREATE TABLE "page_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" text NOT NULL,
	"referrer_host" text,
	"country" text,
	"device" text NOT NULL,
	"browser" text,
	"visitor_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_views_device_check" CHECK ("page_views"."device" IN ('desktop','mobile','tablet'))
);
--> statement-breakpoint
CREATE INDEX "page_views_created_at_idx" ON "page_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "page_views_path_created_at_idx" ON "page_views" USING btree ("path","created_at");