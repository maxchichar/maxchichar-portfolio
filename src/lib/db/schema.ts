import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Portfolio OS database schema.
// Canonical source: "Portfolio OS — FINAL LOCKED SPECIFICATION" §D.3.
// Deliberately NOT implemented (deferred, see §D.13/§1 of that spec):
// knowledge-graph relation tables, slug-redirect table.

/** Postgres `tsvector`, used only for the generated full-text search columns. */
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

// ---------------------------------------------------------------------------
// USERS & AUTH
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: text("role").notNull().default("ADMIN"),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("users_role_check", sql`${table.role} IN ('ADMIN','EDITOR','AUTHOR')`),
  ],
);

// Note: a `sessions` table previously existed here, described as backing
// Auth.js database sessions. That's removed — Auth.js does not support
// Credentials + database sessions together (verified against @auth/core's
// source; see the Phase 2 report), so the architecture moved to JWT
// sessions, which Auth.js manages entirely itself with no table on our
// side. There is no other concrete use for a `sessions` table in the
// locked v1 spec, so it's dropped rather than kept as dead infrastructure.
// Service-account auth for future automated callers (AI Media OS, Phase 11).
// Table exists now per the locked schema; no routes use it until then.
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    hashedKey: text("hashed_key").notNull().unique(),
    scopes: text("scopes")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdBy: uuid("created_by").references(() => users.id),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // DB-level guarantee that a key can never carry publish rights —
    // matches the "AI must never publish" structural rule, enforced here
    // in addition to (not instead of) the service-layer check in Phase 11.
    check(
      "api_keys_no_publish_scope",
      sql`NOT ('content:publish' = ANY(${table.scopes}))`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// MEDIA
// ---------------------------------------------------------------------------

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filename: text("filename").notNull(),
    altText: text("alt_text"),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    storageKey: text("storage_key").notNull().unique(),
    storageUrl: text("storage_url").notNull(),
    status: text("status").notNull().default("PENDING"),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("media_status_idx").on(table.status),
    check("media_status_check", sql`${table.status} IN ('PENDING','READY','REJECTED')`),
  ],
);

// ---------------------------------------------------------------------------
// PROJECTS — item + version split (immutable published versions,
// restore-forward rollback — see the content lifecycle in the spec, §D.4)
// ---------------------------------------------------------------------------

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    status: text("status").notNull().default("ACTIVE"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("projects_status_check", sql`${table.status} IN ('ACTIVE','ARCHIVED')`),
  ],
);

export const projectVersions = pgTable(
  "project_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull().default("DRAFT"),
    basedOnVersionId: uuid("based_on_version_id"),
    title: text("title").notNull(),
    shortDescription: text("short_description").notNull(),
    // Ordered [{ key, heading, content: <Tiptap JSON doc> }] — Tiptap JSON
    // is canonical; sanitized HTML is derived at render time only (§D.6/§D.11).
    sections: jsonb("sections")
      .notNull()
      .default(sql`'[]'::jsonb`),
    category: text("category"),
    year: integer("year"),
    technologies: text("technologies")
      .array()
      .default(sql`'{}'::text[]`),
    githubUrl: text("github_url"),
    liveUrl: text("live_url"),
    documentationUrl: text("documentation_url"),
    coverMediaId: uuid("cover_media_id").references(() => media.id),
    seo: jsonb("seo"),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(title,'') || ' ' || coalesce(short_description,''))`,
    ),
    createdByType: text("created_by_type").notNull().default("HUMAN"),
    createdById: uuid("created_by_id"),
    generationMode: text("generation_mode").notNull().default("HUMAN_CREATED"),
    generationId: text("generation_id"),
    source: text("source"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("project_versions_project_number_idx").on(
      table.projectId,
      table.versionNumber,
    ),
    // At most one published version, at most one open draft, per project —
    // enforced by the database itself, not just application logic.
    uniqueIndex("project_versions_one_published_idx")
      .on(table.projectId)
      .where(sql`${table.status} = 'PUBLISHED'`),
    uniqueIndex("project_versions_one_draft_idx")
      .on(table.projectId)
      .where(sql`${table.status} = 'DRAFT'`),
    index("project_versions_project_status_idx").on(table.projectId, table.status),
    index("project_versions_search_idx").using("gin", table.searchVector),
    foreignKey({
      columns: [table.basedOnVersionId],
      foreignColumns: [table.id],
      name: "project_versions_based_on_fk",
    }),
    check(
      "project_versions_status_check",
      sql`${table.status} IN ('DRAFT','PUBLISHED','SUPERSEDED')`,
    ),
    check(
      "project_versions_created_by_type_check",
      sql`${table.createdByType} IN ('HUMAN','AI')`,
    ),
    check(
      "project_versions_generation_mode_check",
      sql`${table.generationMode} IN ('HUMAN_CREATED','HUMAN_EDITED','AI_GENERATED','AI_ASSISTED','SYSTEM_GENERATED')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// RESEARCH — identical item/version pattern to projects
// ---------------------------------------------------------------------------

export const research = pgTable(
  "research",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    status: text("status").notNull().default("ACTIVE"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("research_status_check", sql`${table.status} IN ('ACTIVE','ARCHIVED')`),
  ],
);

export const researchVersions = pgTable(
  "research_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    researchId: uuid("research_id")
      .notNull()
      .references(() => research.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull().default("DRAFT"),
    basedOnVersionId: uuid("based_on_version_id"),
    title: text("title").notNull(),
    type: text("type").notNull(),
    abstract: text("abstract").notNull(),
    // research_question, background, methodology, evidence_narrative,
    // findings, counterarguments, limitations, conclusion, sources — the
    // prose section is named `evidence_narrative` internally, deliberately
    // distinct from the structured Evidence model below (§D.8 naming note).
    sections: jsonb("sections")
      .notNull()
      .default(sql`'[]'::jsonb`),
    category: text("category"),
    coverMediaId: uuid("cover_media_id").references(() => media.id),
    seo: jsonb("seo"),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(title,'') || ' ' || coalesce(abstract,''))`,
    ),
    createdByType: text("created_by_type").notNull().default("HUMAN"),
    createdById: uuid("created_by_id"),
    generationMode: text("generation_mode").notNull().default("HUMAN_CREATED"),
    generationId: text("generation_id"),
    source: text("source"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("research_versions_research_number_idx").on(
      table.researchId,
      table.versionNumber,
    ),
    uniqueIndex("research_versions_one_published_idx")
      .on(table.researchId)
      .where(sql`${table.status} = 'PUBLISHED'`),
    uniqueIndex("research_versions_one_draft_idx")
      .on(table.researchId)
      .where(sql`${table.status} = 'DRAFT'`),
    index("research_versions_research_status_idx").on(table.researchId, table.status),
    index("research_versions_search_idx").using("gin", table.searchVector),
    foreignKey({
      columns: [table.basedOnVersionId],
      foreignColumns: [table.id],
      name: "research_versions_based_on_fk",
    }),
    check(
      "research_versions_status_check",
      sql`${table.status} IN ('DRAFT','PUBLISHED','SUPERSEDED')`,
    ),
    check(
      "research_versions_type_check",
      sql`${table.type} IN ('Investigation','Technical Note','Experiment','Literature Review','Research Paper')`,
    ),
    check(
      "research_versions_created_by_type_check",
      sql`${table.createdByType} IN ('HUMAN','AI')`,
    ),
    check(
      "research_versions_generation_mode_check",
      sql`${table.generationMode} IN ('HUMAN_CREATED','HUMAN_EDITED','AI_GENERATED','AI_ASSISTED','SYSTEM_GENERATED')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// ARTICLES — same pattern, single Tiptap document instead of a sections array
// ---------------------------------------------------------------------------

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    status: text("status").notNull().default("ACTIVE"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("articles_status_check", sql`${table.status} IN ('ACTIVE','ARCHIVED')`),
  ],
);

export const articleVersions = pgTable(
  "article_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull().default("DRAFT"),
    basedOnVersionId: uuid("based_on_version_id"),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    // Canonical Tiptap JSON document — never HTML (§D.6).
    content: jsonb("content").notNull(),
    readingTime: integer("reading_time"),
    category: text("category"),
    coverMediaId: uuid("cover_media_id").references(() => media.id),
    seo: jsonb("seo"),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(title,'') || ' ' || coalesce(excerpt,''))`,
    ),
    createdByType: text("created_by_type").notNull().default("HUMAN"),
    createdById: uuid("created_by_id"),
    generationMode: text("generation_mode").notNull().default("HUMAN_CREATED"),
    generationId: text("generation_id"),
    source: text("source"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("article_versions_article_number_idx").on(
      table.articleId,
      table.versionNumber,
    ),
    uniqueIndex("article_versions_one_published_idx")
      .on(table.articleId)
      .where(sql`${table.status} = 'PUBLISHED'`),
    uniqueIndex("article_versions_one_draft_idx")
      .on(table.articleId)
      .where(sql`${table.status} = 'DRAFT'`),
    index("article_versions_article_status_idx").on(table.articleId, table.status),
    index("article_versions_search_idx").using("gin", table.searchVector),
    foreignKey({
      columns: [table.basedOnVersionId],
      foreignColumns: [table.id],
      name: "article_versions_based_on_fk",
    }),
    check(
      "article_versions_status_check",
      sql`${table.status} IN ('DRAFT','PUBLISHED','SUPERSEDED')`,
    ),
    check(
      "article_versions_created_by_type_check",
      sql`${table.createdByType} IN ('HUMAN','AI')`,
    ),
    check(
      "article_versions_generation_mode_check",
      sql`${table.generationMode} IN ('HUMAN_CREATED','HUMAN_EDITED','AI_GENERATED','AI_ASSISTED','SYSTEM_GENERATED')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// STATIC PAGES — versioned, same as other content (locked decision, §D.13)
// ---------------------------------------------------------------------------

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("pages_slug_check", sql`${table.slug} IN ('home','about','now')`)],
);

export const pageVersions = pgTable(
  "page_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull().default("DRAFT"),
    basedOnVersionId: uuid("based_on_version_id"),
    // Shape validated per-slug via a Zod discriminated union at the app layer.
    content: jsonb("content").notNull(),
    createdByType: text("created_by_type").notNull().default("HUMAN"),
    createdById: uuid("created_by_id"),
    generationMode: text("generation_mode").notNull().default("HUMAN_CREATED"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("page_versions_page_number_idx").on(table.pageId, table.versionNumber),
    uniqueIndex("page_versions_one_published_idx")
      .on(table.pageId)
      .where(sql`${table.status} = 'PUBLISHED'`),
    uniqueIndex("page_versions_one_draft_idx")
      .on(table.pageId)
      .where(sql`${table.status} = 'DRAFT'`),
    foreignKey({
      columns: [table.basedOnVersionId],
      foreignColumns: [table.id],
      name: "page_versions_based_on_fk",
    }),
    check(
      "page_versions_status_check",
      sql`${table.status} IN ('DRAFT','PUBLISHED','SUPERSEDED')`,
    ),
    check(
      "page_versions_created_by_type_check",
      sql`${table.createdByType} IN ('HUMAN','AI')`,
    ),
    check(
      "page_versions_generation_mode_check",
      sql`${table.generationMode} IN ('HUMAN_CREATED','HUMAN_EDITED','AI_GENERATED','AI_ASSISTED','SYSTEM_GENERATED')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// TAGS — item-level, not versioned. Real FKs, composite primary keys.
// No hierarchies, no synonyms (deliberately out of scope).
// ---------------------------------------------------------------------------

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const projectTags = pgTable(
  "project_tags",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.tagId] })],
);

export const researchTags = pgTable(
  "research_tags",
  {
    researchId: uuid("research_id")
      .notNull()
      .references(() => research.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.researchId, table.tagId] })],
);

export const articleTags = pgTable(
  "article_tags",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.articleId, table.tagId] })],
);

// ---------------------------------------------------------------------------
// EVIDENCE — item-level, deliberately UNVERSIONED (§D.7). Scoped to
// projects and research; articles don't get evidence.
// ---------------------------------------------------------------------------

export const evidence = pgTable(
  "evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    url: text("url"),
    mediaId: uuid("media_id").references(() => media.id),
    // Shape validated per-type by Zod at save time (e.g. before_after
    // requires { metric, before, after, unit }) — not enforced by Postgres.
    data: jsonb("data"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "evidence_type_check",
      sql`${table.type} IN ('repository','benchmark','dataset','screenshot','paper','demo','deployment','measurement','before_after')`,
    ),
  ],
);

export const projectEvidence = pgTable(
  "project_evidence",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    evidenceId: uuid("evidence_id")
      .notNull()
      .references(() => evidence.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.evidenceId] })],
);

export const researchEvidence = pgTable(
  "research_evidence",
  {
    researchId: uuid("research_id")
      .notNull()
      .references(() => research.id, { onDelete: "cascade" }),
    evidenceId: uuid("evidence_id")
      .notNull()
      .references(() => evidence.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.researchId, table.evidenceId] })],
);

// ---------------------------------------------------------------------------
// SITE SETTINGS — singleton row, unversioned (live config, not editorial
// content — §D.13).
// ---------------------------------------------------------------------------

export const siteSettings = pgTable(
  "site_settings",
  {
    id: integer("id").primaryKey(),
    siteName: text("site_name").notNull(),
    siteDescription: text("site_description"),
    logoMediaId: uuid("logo_media_id").references(() => media.id),
    faviconMediaId: uuid("favicon_media_id").references(() => media.id),
    primaryEmail: text("primary_email"),
    socialGithub: text("social_github"),
    socialX: text("social_x"),
    socialLinkedin: text("social_linkedin"),
    socialYoutube: text("social_youtube"),
    socialInstagram: text("social_instagram"),
    socialTiktok: text("social_tiktok"),
    seoDefaultTitle: text("seo_default_title"),
    seoDefaultDescription: text("seo_default_description"),
    ogDefaultMediaId: uuid("og_default_media_id").references(() => media.id),
    analyticsId: text("analytics_id"),
    footerText: text("footer_text"),
    updatedBy: uuid("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("site_settings_singleton_check", sql`${table.id} = 1`)],
);

// ---------------------------------------------------------------------------
// CONTACT
// ---------------------------------------------------------------------------

export const contactSubmissions = pgTable(
  "contact_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    organization: text("organization"),
    reason: text("reason"),
    message: text("message").notNull(),
    honeypot: text("honeypot"),
    ipHash: text("ip_hash"),
    status: text("status").notNull().default("NEW"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("contact_submissions_created_at_idx").on(table.createdAt),
    // Backs the rate-limit count (recent rows for the same ip_hash) — §D.5.
    index("contact_submissions_ip_hash_created_at_idx").on(table.ipHash, table.createdAt),
    check(
      "contact_submissions_status_check",
      sql`${table.status} IN ('NEW','READ','ARCHIVED','SPAM')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// AUDIT LOG
// ---------------------------------------------------------------------------

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    // e.g. 'project.version.created', 'project.version.published',
    // 'project.version.rollback', 'media.validated', 'media.rejected',
    // 'apikey.created', 'apikey.revoked', 'auth.login_failed', 'auth.locked'
    action: text("action").notNull(),
    resourceType: text("resource_type"),
    resourceId: uuid("resource_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_resource_idx").on(table.resourceType, table.resourceId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);
