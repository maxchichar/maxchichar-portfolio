CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"hashed_key" text NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_by" uuid,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_hashed_key_unique" UNIQUE("hashed_key"),
	CONSTRAINT "api_keys_no_publish_scope" CHECK (NOT ('content:publish' = ANY("api_keys"."scopes")))
);
--> statement-breakpoint
CREATE TABLE "article_tags" (
	"article_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "article_tags_article_id_tag_id_pk" PRIMARY KEY("article_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "article_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"based_on_version_id" uuid,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" jsonb NOT NULL,
	"reading_time" integer,
	"category" text,
	"cover_media_id" uuid,
	"seo" jsonb,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(excerpt,''))) STORED,
	"created_by_type" text DEFAULT 'HUMAN' NOT NULL,
	"created_by_id" uuid,
	"generation_mode" text DEFAULT 'HUMAN_CREATED' NOT NULL,
	"generation_id" text,
	"source" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_versions_status_check" CHECK ("article_versions"."status" IN ('DRAFT','PUBLISHED','SUPERSEDED')),
	CONSTRAINT "article_versions_created_by_type_check" CHECK ("article_versions"."created_by_type" IN ('HUMAN','AI')),
	CONSTRAINT "article_versions_generation_mode_check" CHECK ("article_versions"."generation_mode" IN ('HUMAN_CREATED','HUMAN_EDITED','AI_GENERATED','AI_ASSISTED','SYSTEM_GENERATED'))
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "articles_status_check" CHECK ("articles"."status" IN ('ACTIVE','ARCHIVED'))
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"organization" text,
	"reason" text,
	"message" text NOT NULL,
	"honeypot" text,
	"ip_hash" text,
	"status" text DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_submissions_status_check" CHECK ("contact_submissions"."status" IN ('NEW','READ','ARCHIVED','SPAM'))
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"url" text,
	"media_id" uuid,
	"data" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_type_check" CHECK ("evidence"."type" IN ('repository','benchmark','dataset','screenshot','paper','demo','deployment','measurement','before_after'))
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"alt_text" text,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"storage_key" text NOT NULL,
	"storage_url" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"validated_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "media_status_check" CHECK ("media"."status" IN ('PENDING','READY','REJECTED'))
);
--> statement-breakpoint
CREATE TABLE "page_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"based_on_version_id" uuid,
	"content" jsonb NOT NULL,
	"created_by_type" text DEFAULT 'HUMAN' NOT NULL,
	"created_by_id" uuid,
	"generation_mode" text DEFAULT 'HUMAN_CREATED' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_versions_status_check" CHECK ("page_versions"."status" IN ('DRAFT','PUBLISHED','SUPERSEDED')),
	CONSTRAINT "page_versions_created_by_type_check" CHECK ("page_versions"."created_by_type" IN ('HUMAN','AI')),
	CONSTRAINT "page_versions_generation_mode_check" CHECK ("page_versions"."generation_mode" IN ('HUMAN_CREATED','HUMAN_EDITED','AI_GENERATED','AI_ASSISTED','SYSTEM_GENERATED'))
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug"),
	CONSTRAINT "pages_slug_check" CHECK ("pages"."slug" IN ('home','about','now'))
);
--> statement-breakpoint
CREATE TABLE "project_evidence" (
	"project_id" uuid NOT NULL,
	"evidence_id" uuid NOT NULL,
	CONSTRAINT "project_evidence_project_id_evidence_id_pk" PRIMARY KEY("project_id","evidence_id")
);
--> statement-breakpoint
CREATE TABLE "project_tags" (
	"project_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "project_tags_project_id_tag_id_pk" PRIMARY KEY("project_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "project_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"based_on_version_id" uuid,
	"title" text NOT NULL,
	"short_description" text NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category" text,
	"year" integer,
	"technologies" text[] DEFAULT '{}'::text[],
	"github_url" text,
	"live_url" text,
	"documentation_url" text,
	"cover_media_id" uuid,
	"seo" jsonb,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(short_description,''))) STORED,
	"created_by_type" text DEFAULT 'HUMAN' NOT NULL,
	"created_by_id" uuid,
	"generation_mode" text DEFAULT 'HUMAN_CREATED' NOT NULL,
	"generation_id" text,
	"source" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_versions_status_check" CHECK ("project_versions"."status" IN ('DRAFT','PUBLISHED','SUPERSEDED')),
	CONSTRAINT "project_versions_created_by_type_check" CHECK ("project_versions"."created_by_type" IN ('HUMAN','AI')),
	CONSTRAINT "project_versions_generation_mode_check" CHECK ("project_versions"."generation_mode" IN ('HUMAN_CREATED','HUMAN_EDITED','AI_GENERATED','AI_ASSISTED','SYSTEM_GENERATED'))
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug"),
	CONSTRAINT "projects_status_check" CHECK ("projects"."status" IN ('ACTIVE','ARCHIVED'))
);
--> statement-breakpoint
CREATE TABLE "research" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "research_slug_unique" UNIQUE("slug"),
	CONSTRAINT "research_status_check" CHECK ("research"."status" IN ('ACTIVE','ARCHIVED'))
);
--> statement-breakpoint
CREATE TABLE "research_evidence" (
	"research_id" uuid NOT NULL,
	"evidence_id" uuid NOT NULL,
	CONSTRAINT "research_evidence_research_id_evidence_id_pk" PRIMARY KEY("research_id","evidence_id")
);
--> statement-breakpoint
CREATE TABLE "research_tags" (
	"research_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "research_tags_research_id_tag_id_pk" PRIMARY KEY("research_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "research_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"research_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"based_on_version_id" uuid,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"abstract" text NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category" text,
	"cover_media_id" uuid,
	"seo" jsonb,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(abstract,''))) STORED,
	"created_by_type" text DEFAULT 'HUMAN' NOT NULL,
	"created_by_id" uuid,
	"generation_mode" text DEFAULT 'HUMAN_CREATED' NOT NULL,
	"generation_id" text,
	"source" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "research_versions_status_check" CHECK ("research_versions"."status" IN ('DRAFT','PUBLISHED','SUPERSEDED')),
	CONSTRAINT "research_versions_type_check" CHECK ("research_versions"."type" IN ('Investigation','Technical Note','Experiment','Literature Review','Research Paper')),
	CONSTRAINT "research_versions_created_by_type_check" CHECK ("research_versions"."created_by_type" IN ('HUMAN','AI')),
	CONSTRAINT "research_versions_generation_mode_check" CHECK ("research_versions"."generation_mode" IN ('HUMAN_CREATED','HUMAN_EDITED','AI_GENERATED','AI_ASSISTED','SYSTEM_GENERATED'))
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"site_name" text NOT NULL,
	"site_description" text,
	"logo_media_id" uuid,
	"favicon_media_id" uuid,
	"primary_email" text,
	"social_github" text,
	"social_x" text,
	"social_linkedin" text,
	"social_youtube" text,
	"social_instagram" text,
	"social_tiktok" text,
	"seo_default_title" text,
	"seo_default_description" text,
	"og_default_media_id" uuid,
	"analytics_id" text,
	"footer_text" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_singleton_check" CHECK ("site_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'ADMIN' NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" IN ('ADMIN','EDITOR','AUTHOR'))
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_based_on_fk" FOREIGN KEY ("based_on_version_id") REFERENCES "public"."article_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_based_on_fk" FOREIGN KEY ("based_on_version_id") REFERENCES "public"."page_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_evidence" ADD CONSTRAINT "project_evidence_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_evidence" ADD CONSTRAINT "project_evidence_evidence_id_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_based_on_fk" FOREIGN KEY ("based_on_version_id") REFERENCES "public"."project_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research" ADD CONSTRAINT "research_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_evidence" ADD CONSTRAINT "research_evidence_research_id_research_id_fk" FOREIGN KEY ("research_id") REFERENCES "public"."research"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_evidence" ADD CONSTRAINT "research_evidence_evidence_id_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_tags" ADD CONSTRAINT "research_tags_research_id_research_id_fk" FOREIGN KEY ("research_id") REFERENCES "public"."research"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_tags" ADD CONSTRAINT "research_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_versions" ADD CONSTRAINT "research_versions_research_id_research_id_fk" FOREIGN KEY ("research_id") REFERENCES "public"."research"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_versions" ADD CONSTRAINT "research_versions_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_versions" ADD CONSTRAINT "research_versions_based_on_fk" FOREIGN KEY ("based_on_version_id") REFERENCES "public"."research_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_favicon_media_id_media_id_fk" FOREIGN KEY ("favicon_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_og_default_media_id_media_id_fk" FOREIGN KEY ("og_default_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "article_versions_article_number_idx" ON "article_versions" USING btree ("article_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "article_versions_one_published_idx" ON "article_versions" USING btree ("article_id") WHERE "article_versions"."status" = 'PUBLISHED';--> statement-breakpoint
CREATE UNIQUE INDEX "article_versions_one_draft_idx" ON "article_versions" USING btree ("article_id") WHERE "article_versions"."status" = 'DRAFT';--> statement-breakpoint
CREATE INDEX "article_versions_article_status_idx" ON "article_versions" USING btree ("article_id","status");--> statement-breakpoint
CREATE INDEX "article_versions_search_idx" ON "article_versions" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contact_submissions_created_at_idx" ON "contact_submissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contact_submissions_ip_hash_created_at_idx" ON "contact_submissions" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "media_status_idx" ON "media" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "page_versions_page_number_idx" ON "page_versions" USING btree ("page_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "page_versions_one_published_idx" ON "page_versions" USING btree ("page_id") WHERE "page_versions"."status" = 'PUBLISHED';--> statement-breakpoint
CREATE UNIQUE INDEX "page_versions_one_draft_idx" ON "page_versions" USING btree ("page_id") WHERE "page_versions"."status" = 'DRAFT';--> statement-breakpoint
CREATE UNIQUE INDEX "project_versions_project_number_idx" ON "project_versions" USING btree ("project_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "project_versions_one_published_idx" ON "project_versions" USING btree ("project_id") WHERE "project_versions"."status" = 'PUBLISHED';--> statement-breakpoint
CREATE UNIQUE INDEX "project_versions_one_draft_idx" ON "project_versions" USING btree ("project_id") WHERE "project_versions"."status" = 'DRAFT';--> statement-breakpoint
CREATE INDEX "project_versions_project_status_idx" ON "project_versions" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "project_versions_search_idx" ON "project_versions" USING gin ("search_vector");--> statement-breakpoint
CREATE UNIQUE INDEX "research_versions_research_number_idx" ON "research_versions" USING btree ("research_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "research_versions_one_published_idx" ON "research_versions" USING btree ("research_id") WHERE "research_versions"."status" = 'PUBLISHED';--> statement-breakpoint
CREATE UNIQUE INDEX "research_versions_one_draft_idx" ON "research_versions" USING btree ("research_id") WHERE "research_versions"."status" = 'DRAFT';--> statement-breakpoint
CREATE INDEX "research_versions_research_status_idx" ON "research_versions" USING btree ("research_id","status");--> statement-breakpoint
CREATE INDEX "research_versions_search_idx" ON "research_versions" USING gin ("search_vector");