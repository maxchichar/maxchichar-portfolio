ALTER TABLE "site_settings" ADD COLUMN "hero_media_id" uuid;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "about_media_id" uuid;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_about_media_id_media_id_fk" FOREIGN KEY ("about_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;