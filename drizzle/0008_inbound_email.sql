ALTER TABLE "contact_submissions" ADD COLUMN "source" text DEFAULT 'form' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN "subject" text;--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN "message_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_submissions_message_id_idx" ON "contact_submissions" USING btree ("message_id");--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_source_check" CHECK ("contact_submissions"."source" IN ('form','email'));