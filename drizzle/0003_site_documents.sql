CREATE TABLE "site_documents" (
	"key" text PRIMARY KEY NOT NULL,
	"media_id" uuid NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_documents_key_check" CHECK ("site_documents"."key" IN ('cv'))
);
--> statement-breakpoint
ALTER TABLE "site_documents" ADD CONSTRAINT "site_documents_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_documents" ADD CONSTRAINT "site_documents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;