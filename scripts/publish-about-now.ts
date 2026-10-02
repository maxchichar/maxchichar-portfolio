import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "../src/lib/db/schema";
import { aboutPageContentSchema, nowPageContentSchema } from "../src/lib/validation/page";

neonConfig.webSocketConstructor = ws;

const ABOUT_CONTENT = aboutPageContentSchema.parse({
  slug: "about",
  intro:
    "I am Chibueze Maxwell, a Super Intelligence (SI) Engineer & Entrepreneur dedicated to building intelligent systems for real-world problems.",
  bio: "As an engineer and entrepreneur operating in the Super Intelligence (SI) space, my focus is designing, implementing, and deploying intelligent software architectures. I specialize in building robust platforms, end-to-end systems, and high-performance infrastructure that bridge advanced algorithmic capabilities with practical execution.",
  whatIBuild:
    "I build production-grade intelligent systems, full-stack software architectures, resilient data pipelines, and developer-focused tooling. My engineering work emphasizes deterministic state management, rigorous verification, and clean system boundaries.",
  howIThink:
    "I approach engineering from first principles: decomposing complex problems into verifiable components, prioritizing data integrity, and minimizing operational complexity. Software should be predictable, resilient, and built to solve tangible problems rather than chase speculative complexity.",
  interests:
    "My focus areas include Super Intelligence engineering, autonomous agent architectures, distributed backend infrastructure, real-time data systems, and human-machine interaction at the intersection of emerging technology and society.",
  capabilities:
    "Full-stack engineering, distributed systems, TypeScript and modern web architecture, database design and optimization, secure API and authentication protocols, and end-to-end production verification.",
  direction:
    "Advancing the Super Intelligence (SI) discipline through continuous engineering, developing practical platforms that empower real-world productivity, and exploring the frontiers of intelligent system design.",
});

const NOW_CONTENT = nowPageContentSchema.parse({
  slug: "now",
  currentlyBuilding:
    "Developing the MAXCHICHAR Portfolio OS platform, refining production deployment architecture, and engineering system integrations.",
  researching:
    "Investigating patterns in Super Intelligence (SI) engineering, system predictability in automated workflows, and robust state verification across distributed platforms.",
  learning:
    "Deepening practical methodologies for advanced system verification, low-latency database interactions, and serverless runtime performance optimization.",
  interests:
    "Super Intelligence systems engineering, resilient software design, developer tooling, and modern full-stack platform architecture.",
  thesis:
    "The future of software belongs to systems designed with super intelligence principles: predictable, self-verifying, and aligned with human intent to solve meaningful real-world challenges.",
  recentChanges:
    "Transitioned core professional positioning to Super Intelligence (SI) Engineer & Entrepreneur, finalized live production hardening, and established public system baselines.",
});

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL must be set.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  // Find the primary admin
  const [admin] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(
      and(eq(schema.users.role, "ADMIN"), eq(schema.users.email, "admin@chibueze.com")),
    )
    .limit(1);

  if (!admin) {
    throw new Error("Primary admin user admin@chibueze.com not found");
  }

  const targets = [
    { slug: "about" as const, content: ABOUT_CONTENT },
    { slug: "now" as const, content: NOW_CONTENT },
  ];

  for (const { slug, content } of targets) {
    console.log(`Processing page: ${slug}`);

    // 1. Get or create page record
    let [page] = await db
      .select()
      .from(schema.pages)
      .where(eq(schema.pages.slug, slug))
      .limit(1);

    if (!page) {
      const [created] = await db.insert(schema.pages).values({ slug }).returning();
      if (!created) throw new Error(`Failed to create page ${slug}`);
      page = created;
      console.log(`  Created page row for ${slug} (${page.id})`);
    } else {
      console.log(`  Found existing page row for ${slug} (${page.id})`);
    }

    const pageId = page.id;

    await db.transaction(async (tx) => {
      // Check existing versions
      const versions = await tx
        .select()
        .from(schema.pageVersions)
        .where(eq(schema.pageVersions.pageId, pageId))
        .orderBy(desc(schema.pageVersions.versionNumber));

      const published = versions.find((v) => v.status === "PUBLISHED");
      const draft = versions.find((v) => v.status === "DRAFT");

      let versionToPublishId: string;

      if (draft) {
        // Update existing draft with genuine production content
        const [updatedDraft] = await tx
          .update(schema.pageVersions)
          .set({
            content,
            generationMode: "HUMAN_EDITED",
            createdById: admin.id,
          })
          .where(eq(schema.pageVersions.id, draft.id))
          .returning();
        if (!updatedDraft) throw new Error("Failed to update draft");
        versionToPublishId = updatedDraft.id;
        console.log(
          `  Updated existing draft version ${draft.versionNumber} (${draft.id})`,
        );
      } else {
        // Create a new draft
        const nextNumber = (versions[0]?.versionNumber ?? 0) + 1;
        const [newDraft] = await tx
          .insert(schema.pageVersions)
          .values({
            pageId,
            versionNumber: nextNumber,
            status: "DRAFT",
            basedOnVersionId: published?.id ?? null,
            content,
            createdByType: "HUMAN",
            createdById: admin.id,
            generationMode: "HUMAN_CREATED",
          })
          .returning();
        if (!newDraft) throw new Error("Failed to create draft");
        versionToPublishId = newDraft.id;
        console.log(`  Created new draft version ${nextNumber} (${newDraft.id})`);
      }

      // Mark current published as superseded
      if (published) {
        await tx
          .update(schema.pageVersions)
          .set({ status: "SUPERSEDED" })
          .where(eq(schema.pageVersions.id, published.id));
        console.log(
          `  Marked previous published version ${published.versionNumber} superseded`,
        );
      }

      // Publish the draft
      const [publishedRow] = await tx
        .update(schema.pageVersions)
        .set({
          status: "PUBLISHED",
          publishedAt: new Date(),
        })
        .where(eq(schema.pageVersions.id, versionToPublishId))
        .returning();

      if (!publishedRow) throw new Error("Failed to publish version");

      console.log(
        `  Published version ${publishedRow.versionNumber} (${publishedRow.id}) for page "${slug}"`,
      );

      // Log audit
      await tx.insert(schema.auditLogs).values({
        userId: admin.id,
        action: "page.version.published",
        resourceType: "page",
        resourceId: pageId,
        metadata: {
          versionId: publishedRow.id,
          versionNumber: publishedRow.versionNumber,
          slug,
        },
      });
    });
  }

  // Verification step
  console.log("\nVerifying published status:");
  for (const { slug } of targets) {
    const [page] = await db
      .select()
      .from(schema.pages)
      .where(eq(schema.pages.slug, slug));
    if (!page) continue;
    const [pub] = await db
      .select()
      .from(schema.pageVersions)
      .where(
        and(
          eq(schema.pageVersions.pageId, page.id),
          eq(schema.pageVersions.status, "PUBLISHED"),
        ),
      );
    console.log(
      `- /${slug}: Published version #${pub?.versionNumber} (publishedAt: ${pub?.publishedAt})`,
    );
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
