// Idempotent pages seed. Run standalone via `npm run seed:pages`
// (tsx + Node, outside the Next.js bundler) — deliberately does NOT
// import src/lib/db or src/server/repositories/pages.ts, since that
// import chain carries the `server-only` marker package, which
// unconditionally throws when resolved outside Next's bundler. Mirrors
// scripts/seed-admin.ts's approach exactly: its own disposable
// connection, raw schema + validation imports only.
//
// Per Decision 4: no route ever creates these rows — this script is the
// only place that does, and it's safe to run repeatedly (checks before
// inserting, both for the page row and for whether it already has any
// version at all).
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "../src/lib/db/schema";
import {
  type PageSlug,
  contentSchemaForSlug,
  PAGE_SLUGS,
} from "../src/lib/validation/page";

neonConfig.webSocketConstructor = ws;

// home's hero fields are the actual copy already live on the homepage —
// not placeholder text, just migrated into the CMS row it'll eventually
// be read from (Level 8.4). currentFocusSummary has no prior copy to draw
// from, so it gets the same honest, obviously-edit-me placeholder style
// used for every about/now field below.
const SEED_CONTENT: Record<PageSlug, Record<string, string>> = {
  home: {
    heroEyebrow: "AI-Native Engineer & Entrepreneur",
    heroHeadline: "I build intelligent systems for real-world problems.",
    heroBody:
      "AI-native engineer and entrepreneur focused on AI systems, software engineering, emerging technology, and problems at the intersection of technology and society.",
    heroPrimaryCtaLabel: "Explore my work",
    heroPrimaryCtaHref: "/work",
    heroSecondaryCtaLabel: "Read my research",
    heroSecondaryCtaHref: "/research",
    currentFocusSummary: "Add a short note about what you're currently focused on.",
  },
  about: {
    intro: "Add a short introduction here.",
    bio: "Add a longer biography here.",
    whatIBuild: "Describe what you build here.",
    howIThink: "Describe how you think about problems here.",
    interests: "List your areas of interest here.",
    capabilities: "Describe your capabilities here.",
    direction: "Describe your current direction here.",
  },
  now: {
    currentlyBuilding: "Add what you're currently building here.",
    researching: "Add what you're currently researching here.",
    learning: "Add what you're currently learning here.",
    interests: "Add your current interests here.",
    thesis: "Add your current thesis here.",
    recentChanges: "Add recent changes here.",
  },
};

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL must be set.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  for (const slug of PAGE_SLUGS) {
    const [existingPage] = await db
      .select()
      .from(schema.pages)
      .where(eq(schema.pages.slug, slug))
      .limit(1);

    const page =
      existingPage ?? (await db.insert(schema.pages).values({ slug }).returning())[0];

    if (!page) throw new Error(`Failed to find or create page row for slug "${slug}"`);

    if (existingPage) {
      console.log(`Page "${slug}" already exists (${page.id}).`);
    } else {
      console.log(`Created page "${slug}" (${page.id}).`);
    }

    const [existingVersion] = await db
      .select({ id: schema.pageVersions.id })
      .from(schema.pageVersions)
      .where(eq(schema.pageVersions.pageId, page.id))
      .limit(1);

    if (existingVersion) {
      console.log(`  Already has a version — skipping.`);
      continue;
    }

    const content = contentSchemaForSlug(slug).parse({
      slug,
      ...SEED_CONTENT[slug],
    });

    await db.insert(schema.pageVersions).values({
      pageId: page.id,
      versionNumber: 1,
      status: "DRAFT",
      content,
      createdByType: "HUMAN",
      createdById: null,
      generationMode: "SYSTEM_GENERATED",
    });

    console.log(`  Created initial DRAFT version for "${slug}".`);
  }

  await pool.end();
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("Pages seed failed:", error);
  process.exit(1);
});
