import "server-only";

import { db } from "@/lib/db";

import * as pagesRepo from "../repositories/pages";

// Level 8.1 (data layer + fixed-row initialization) only —
// listPagesOverview, mirroring listResearchOverview/listArticlesOverview's
// shape, for Level 8.2's editor list to consume. ensureDraft, saveDraft,
// publishPage, rollbackPage mirror the research/articles pattern and land
// in 8.2 alongside the editor that uses them.
//
// Row creation for the three fixed pages deliberately does NOT live here.
// scripts/seed-pages.ts owns that, as a standalone script with its own
// disposable DB connection — the same reason scripts/seed-admin.ts
// doesn't go through a repository/service either: this module chain
// imports "server-only" (via @/lib/db), which throws unconditionally
// outside the Next.js bundler. Keeping creation logic out of this
// service also means no route can ever be wired to trigger it, which is
// the actual point of Decision 4, not just an implementation detail.

export async function listPagesOverview() {
  const items = await pagesRepo.listPages(db);
  return Promise.all(
    items.map(async (page) => {
      const versions = await pagesRepo.listVersions(db, page.id);
      return {
        page,
        draft: versions.find((v) => v.status === "DRAFT") ?? null,
        published: versions.find((v) => v.status === "PUBLISHED") ?? null,
      };
    }),
  );
}
