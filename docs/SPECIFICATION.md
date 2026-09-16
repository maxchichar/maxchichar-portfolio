# Portfolio OS — Specification (Ground Truth)

This document was previously conversation-only and separately-delivered
zip artifacts, never actually committed into the repository it governs —
a real gap, fixed here. This is the authoritative source of truth for
architecture, product, and design decisions. If code contradicts this
document, the document wins and the code is wrong; report the conflict
rather than silently resolving it either direction.

## Locked engineering decisions

- **Stack**: Next.js (App Router) + TypeScript strict, Tailwind v4, Drizzle
  ORM, PostgreSQL on Neon (`@neondatabase/serverless`, `drizzle-orm/neon-serverless`,
  WebSocket/`Pool` — needed for real transactions, not `neon-http`), Zod
  validation, Tiptap (JSON canonical, never HTML as source of truth).
- **Auth**: Auth.js v5, Credentials provider, Argon2id (`@node-rs/argon2`),
  **JWT sessions** (changed from an original "database sessions" decision —
  Auth.js does not support Credentials + database sessions together; see
  `@auth/core`'s `assert.ts`). No adapter. No `sessions` table — removed,
  no concrete use once nothing read/wrote it. DB-backed login lockout
  (`users.failed_login_count` / `locked_until`, 5 attempts → 15 min).
- **Content lifecycle**: every content type (`projects`, `research`,
  `articles`, `pages`) is an item/version split. Published versions are
  **immutable**; editing published content clones a new `DRAFT` version
  (`based_on_version_id`); publishing flips `DRAFT → PUBLISHED` and the
  previous `PUBLISHED → SUPERSEDED`; rollback is **restore-forward** (clone
  an old version into a new draft, then publish it — never mutate history
  in place). DB enforces at most one `PUBLISHED` and one `DRAFT` version
  per item via partial unique indexes — this already exists in the schema
  from Phase 2 and must not be bypassed by application code.
- **Evidence**: first-class, but **unversioned** (item-level, like tags —
  it documents facts about the work, not editorial prose). Scoped to
  projects and research only, not articles. Types: `repository`,
  `benchmark`, `dataset`, `screenshot`, `paper`, `demo`, `deployment`,
  `measurement`, `before_after`. `data` shape validated per-type by Zod at
  save time (e.g. `before_after` requires `{ metric, before, after, unit }`),
  not by the database.
- **AI provenance**: every version row carries `created_by_type`
  (`HUMAN`/`AI`), `created_by_id`, `generation_mode`, `generation_id`,
  `source`. Admin-created content is always `HUMAN` / `HUMAN_CREATED`.
  `api_keys` table exists for a future Content API (Phase 11) but has a
  DB-level CHECK barring `content:publish` from ever being a grantable
  scope — publish is human-session-only, structurally, not just by policy.
- **Media**: two-stage flow — presigned upload request (server validates
  declared MIME/size, creates `media` row `status=PENDING`) → client PUTs
  directly to R2 → confirm callback → server re-validates the **real**
  bytes (magic-byte sniff, not the client-declared type) → `status=READY`
  or `REJECTED`. Only `READY` media is selectable in any picker. SVG
  rejected outright in the minimal (Phase 3) version.
- **Deferred, not built**: knowledge-graph relation tables, slug redirects,
  multi-role (EDITOR/AUTHOR) enforcement beyond ADMIN, Content API routes
  (Phase 11), full media library UI (Phase 7).

## Public information architecture

Nav: Work · Research · Writing · Now · About, Contact as a persistent CTA,
search as an icon-triggered overlay. Dark-only v1, no theme toggle.
Routes: `/`, `/work`, `/work/[slug]`, `/research`, `/research/[slug]`,
`/writing`, `/writing/[slug]`, `/now`, `/about`, `/contact`.

## Positioning

Eyebrow: **"AI-Native Engineer & Entrepreneur"**. Headline:
**"I build intelligent systems for real-world problems."** Voice: evidence
over adjectives, no claimed scale/clients/revenue (no schema field exists
for these, deliberately), failures carry equal narrative weight to
successes, geography mentioned once/factually in About only.

## Design tokens

```
--bg: #0A0A0B            --accent: #4F7CFF (interaction/action — sole
--surface: #131316          clickability signal)
--border: #232328         --accent-purple: #8B5CF6 (identity only —
--text: #F2F1ED             logo, eyebrow, one hero emphasis, section
--text-muted: #8C8B92       index markers, dividers, washes)
                           --accent-purple-muted: #6D4AC0
```

Purple is never used for buttons, links, focus rings, form/validation
states, hover states, or status indicators. Typography: Inter Tight (UI/
headings), Newsreader (long-form reading), JetBrains Mono (code/technical
labels only) — self-hosted via Fontsource, not `next/font/google` (no
runtime dependency on a third-party font CDN). Radii: 2px badges/inputs,
6px cards/buttons, 12px modals/panels.

## Project & research proof architecture

Project case study section order: Hero → Problem → Context → Why This
Approach → Hypothesis → Approach → Architecture → Implementation →
Experiments → **Evidence Wall** → Results → **What Failed** (visually
distinguished, muted-tone left border, not accent color) → Tradeoffs →
Lessons → Limitations → Future Work → Related → Links footer. Research
gets the same Evidence Wall, labeled "Exhibits" there specifically (to
avoid colliding with research's own "Evidence" prose section — the
component is called Evidence Wall everywhere else). Any section with no
content for its key is omitted entirely, not rendered empty — applies to
all 14+ narrative sections and to the Evidence Wall itself.

## Implementation phases

| Phase | Scope                                       | Status                                      |
| ----- | ------------------------------------------- | ------------------------------------------- |
| 0     | Architecture                                | Done                                        |
| 1     | Foundation                                  | Done                                        |
| 2     | Database + Auth                             | Done                                        |
| **3** | **Projects CMS + Evidence + minimal media** | **In progress**                             |
| 4     | Public Work pages                           | Not started                                 |
| 5     | Research CMS + public pages                 | Not started                                 |
| 6     | Writing (Articles) CMS + public pages       | Not started                                 |
| 7     | Full media library                          | Not started                                 |
| 8     | Settings & static Pages                     | Not started                                 |
| 9     | SEO/Performance/Security/Testing            | Not started                                 |
| 10    | Deployment                                  | Not started                                 |
| 11    | AI integration (Content API)                | Not started, only when explicitly requested |

### Phase 3 scope, precisely

Full version lifecycle (create → draft → publish → edit-forks-new-draft →
publish → rollback → archive) for **projects only** (research/articles are
Phase 5/6, not Phase 3), through a real admin UI, backed by real
repository/service layers — not a reimplementation of the version-lifecycle
rules, which the schema (partial unique indexes) already enforces from
Phase 2. Evidence attach (projects only for now — research evidence is
Phase 5). Minimal media (the 4-step validated pipeline above), moved into
Phase 3 from its original Phase 7-only placement, specifically so the
Project editor can attach a real cover image and Evidence can attach real
screenshots without waiting for the full media library. Explicitly **not**
Phase 3: any public route, Tags UI is in-scope (basic assignment, no
hierarchy/synonyms), Research/Article/Page editors, the full `/admin/media`
library, Content API.

Phase 3 gate: an admin can create, version, publish, and roll back a
project entirely through the admin UI, with evidence and a cover image
attached, verified against a real database — not just typechecked.
