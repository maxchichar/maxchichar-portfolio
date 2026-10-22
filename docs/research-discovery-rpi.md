# Research discovery — Research, Plan, Implementation

## Research

The homepage and `/research` already call the same `listPublicResearchOverview` service. Its repository query joins only PUBLISHED versions of ACTIVE research, ordered by publication date. Public detail enforces the same publication and item status. Both routes render dynamically. The mismatch was downstream: homepage filtered out every item without `research.featured`, whereas `/research` included those items. A published, unfeatured paper could therefore appear in the listing while the homepage claimed research was being documented.

Cover capability already exists end to end: `coverMediaId` in version storage and validation; CMS ImageField with uploads and library selection; draft save verifying READY media; cloning on draft creation and rollback; public service resolution to `coverUrl`; detail rendering. Homepage and listing discarded that cover URL.

## Plan

- Keep public eligibility unchanged; select curated research first and fill up to three homepage slots by publication date.
- Replace text-only research rows with a shared editorial card using the existing image pipeline, with a branded fallback when no cover exists.
- Explain cover usage/cropping in CMS, and invalidate public research routes after publication lifecycle changes.
- Check responsive layout, semantic headings, keyboard focus, reduced motion, and cover loading. Preserve distinct unavailable/empty messages and existing type filtering.

## Implementation

- `selectHomepageResearch` sorts a copy, keeps featured ordering, breaks ties by recency, and includes unfeatured publications.
- Shared ResearchCard renders 16:10 covers, paper type, field, publication year, title, abstract, and reading affordance. Homepage uses h3, listing h2. Each card has one link and decorative images/ornaments are excluded from its accessible name.
- Cover delivery reuses MediaImage: responsive optimized images for the configured uploads origin, lazy loading, per-layout sizes, and reserved aspect ratio. No cover uses a dark/purple typographic composition instead of a blank image slot.
- CMS cover help explains public placement, publishing, and crop ratio. Existing schema/upload persistence is reused; no migration required.
- Publish, rollback, archive, and unarchive invalidate `/` and the `/research` layout subtree.
- Existing type filters, error-vs-empty messages, and request-level loading/error handling remain. The existing index skeleton already reserves 16:10 image blocks and two-column desktop layout.

## Verification

- `npm test`: 209 passed, including new unfeatured/curated selection, ordering, immutability, limit, and cover keep/set/clear validation cases.
- Eight Playwright checks passed using the actual ResearchCard and compiled site CSS/fonts, with synthetic records and an intercepted cover image: homepage/listing × desktop/mobile × dark/light. Checks include destination, visible title/metadata, loaded decorative cover, lazy loading, focus outline, horizontal overflow, and reduced-motion duration. Viewed dark desktop/mobile screenshots in `outputs/research-ui/`.
- Typecheck, ESLint, production build, and diff whitespace checks passed. Final fixture edits were linted separately.
- Initial sandbox runs prevented test runner sockets/browser launch and stalled the build. Reran with approved expanded execution permissions. Initial browser assertions were corrected for Next.js data-URI eager behavior (fixture now uses an intercepted URL) and the existing near-zero reduced-motion CSS duration.
- Browser checks are isolated component/layout fixtures, not a live database or CMS upload/publish end-to-end test. No production data changed and nothing deployed. The reported paper's live publication status and existing cover were not independently inspected.
- Pre-existing unrelated admin-dialog changes were preserved.
