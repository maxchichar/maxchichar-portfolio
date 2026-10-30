CREATE TABLE "contact_email_html" (
	"submission_id" uuid PRIMARY KEY NOT NULL,
	"html" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_email_html" ADD CONSTRAINT "contact_email_html_submission_id_contact_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."contact_submissions"("id") ON DELETE cascade ON UPDATE no action;