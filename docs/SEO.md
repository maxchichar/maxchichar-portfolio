# Search visibility: audit, plan and measurement

Last reviewed: 30 Oct 2026. This file separates what is verified, what the
code now does, and what needs a person with account access.

## 1. Identity

| Field                | Value                                                                                         | Status                                                         |
| -------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Public name          | Chibueze Maxwell                                                                              | Site settings, live site                                       |
| Alias                | MAXCHICHAR                                                                                    | Live site, social handles                                      |
| Full name            | Chibueze Charles Maxwell                                                                      | Confirmed by the owner for public use                          |
| Profession           | AI engineer; also researcher, writer, entrepreneur                                            | Self-described on the site                                     |
| Official site        | https://chibuezemaxwell.com (www and http → 308 to apex)                                      | Verified live                                                  |
| Profiles in `sameAs` | github.com/maxchichar, x.com/maxchichar, linkedin.com/in/maxchichar, instagram.com/maxchichar | Linked from the site (owner-claimed, not independent evidence) |
| Published work       | 3 projects (RefJou, Py-Modu, RepoTrace), 3 research essays, 4 articles                        | Live sitemap                                                   |
| Market / language    | Nigeria, English                                                                              | Inferred from content ("Nigeria needs builders…"); confirm     |

**Ambiguity.** "Chibueze" is a common Igbo name shared by footballers,
academics and others; "Chibueze Maxwell" as an exact pair returned no other
person, and "MAXCHICHAR" returned nothing at all. Both are winnable exact
matches. The full name "Chibueze Charles Maxwell" is published as an
`alternateName` alongside MAXCHICHAR (`SITE_AUTHOR_ALTERNATE_NAMES` in
`src/lib/metadata.ts`); add any other public name form there.

## 2. Audit

**Strengths (already in place):** server-rendered Next.js pages; per-page
titles, descriptions and canonicals; dynamic sitemap with `lastmod`; RSS;
per-section Open Graph images; Article / ScholarlyArticle / CreativeWork /
ProfilePage / BreadcrumbList JSON-LD; noindex during database outages;
https + apex canonical redirects at the edge.

**Defects found and fixed:**

| Priority | Defect                                                                                                                           | Fix                                                                                                               |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| P0       | Edge Worker 404'd `/llms.txt`, `/llms-full.txt`, `/cv`, `/icon.svg`, `/apple-icon.png`, `/manifest.webmanifest`, `/indexnow.txt` | Allowlist + regression test (`cloudflare-edge.mjs`). **Needs `npm run deploy:edge`.**                             |
| P0       | Not found in web search for either name (new domain, Oct 2026 content)                                                           | Bing verification + IndexNow wiring; manual submission below                                                      |
| P1       | Google verification only on the home page                                                                                        | Site-wide; Bing/Yandex via env                                                                                    |
| P1       | Person entity named "CHIBUEZE MAXWELL" (display caps), no description, image or topics; only on home                             | Proper name, alias, description, photo, `knowsAbout` from published tags; author + publisher links on all content |
| P1       | About title was "About"                                                                                                          | "About Chibueze Maxwell (MAXCHICHAR)"                                                                             |
| P1       | One robots group for every bot                                                                                                   | Search, AI-search and AI-training crawlers in named groups                                                        |
| P2       | No manifest / theme colour; article OG lacked dates and tags                                                                     | Added                                                                                                             |

## 3. Query map

| Query                                                       | Intent        | Target page                    | Evidence | Opportunity                                  |
| ----------------------------------------------------------- | ------------- | ------------------------------ | -------- | -------------------------------------------- |
| chibueze maxwell                                            | Navigational  | `/`                            | Strong   | High: no exact competitor                    |
| maxchichar                                                  | Navigational  | `/`                            | Strong   | High: unique token                           |
| who is chibueze maxwell                                     | Informational | `/about`                       | Strong   | High                                         |
| chibueze maxwell ai engineer                                | Navigational  | `/`, `/about`                  | Strong   | High                                         |
| chibueze maxwell cv / resume                                | Transactional | `/cv` (once edge deploy lands) | Strong   | Medium                                       |
| refjou / py-modu / repotrace                                | Navigational  | `/work/<slug>`                 | Medium   | Medium; compete with own GitHub repos (fine) |
| chibueze maxwell + article title                            | Navigational  | `/writing/<slug>`              | Strong   | Medium                                       |
| "intelligence is not reliability", "nigeria needs builders" | Informational | articles                       | Medium   | Low–medium: competitive phrases              |
| AI reliability / LLM limitations (nonbranded)               | Informational | research                       | Weak     | Low until external links exist               |

Realistic aim for the next 90 days: own page one for the two name queries and
project names. Nonbranded ranking depends on external links (section 6).

## 4. Crawler policy

| Group       | User agents                                                                                                                | Policy                                                         | Effect                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------- |
| Search      | `*` (Googlebot, Bingbot, Brave, Yandex, Applebot, DuckDuckBot)                                                             | Allow public, block `/admin`, `/api`, `/preview`               | Search results                         |
| AI search   | OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User, DuckAssistBot                  | Same                                                           | Citations in AI answers                |
| AI training | GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot, meta-externalagent, Bytespider, cohere-training-data-crawler | Allowed by default; `AI_TRAINING_CRAWLERS=block` disallows all | Model training only; no ranking effect |

`llms.txt` is an optional convenience, not a ranking or citation signal.

## 5. Owner actions (need account access)

1. **Deploy the edge Worker:** `npm run deploy:edge` after merging.
2. **Bing Webmaster Tools** → add site (import from Google Search Console),
   set `BING_SITE_VERIFICATION`, submit `/sitemap.xml`. This also covers
   DuckDuckGo, Yahoo, Ecosia and ChatGPT search, which draw on Bing's index.
3. **IndexNow:** set `INDEXNOW_KEY` (8–128 chars, `A-Za-z0-9-`), redeploy,
   confirm `https://chibuezemaxwell.com/indexnow.txt` returns the key.
4. **Google Search Console** → submit `/sitemap.xml`, request indexing for
   `/`, `/about`, and each project; check Page indexing weekly.
5. **Site settings (admin):** upload a profile photo (avatar) and fill every
   social URL; they feed `image` and `sameAs`.
6. Optional: Yandex Webmaster (`YANDEX_SITE_VERIFICATION`).

## 6. External authority (do not fabricate any of it)

- **GitHub:** profile README and each project repo link back to
  `chibuezemaxwell.com/work/<slug>`; set the profile website field.
- **LinkedIn / X / Instagram:** identical name "Chibueze Maxwell", handle
  MAXCHICHAR, the same one-line description, website link.
- **Republish with canonical:** cross-post articles on Medium, Dev.to or
  Hashnode with the canonical URL pointing back to the site.
- **Genuine mentions:** talks, podcasts, community posts, open-source
  contributions; each real external link is worth more than any on-page change.
- **Wikidata:** only once independent, reliable sources exist (notability rules).

## 7. Measurement

Record a baseline now, then monthly:

| Metric                                  | Source                                                                                                           | Procedure                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Indexed pages                           | Google Search Console → Pages; Bing → Site Explorer                                                              | Count vs sitemap URLs (currently ~25)              |
| Branded impressions / clicks / position | GSC + Bing → Performance, filter query contains "chibueze" or "maxchichar"                                       | Monthly export                                     |
| Nonbranded impressions                  | Same, excluding those terms                                                                                      | Monthly                                            |
| Landing pages                           | GSC Pages report; admin Analytics                                                                                | Top 10                                             |
| Referring domains                       | GSC → Links; Bing → Backlinks                                                                                    | Count only real domains                            |
| AI referrals                            | Admin Analytics referrers: chatgpt.com, perplexity.ai, copilot.microsoft.com, claude.ai, gemini.google.com       | Monthly                                            |
| AI citations                            | Ask ChatGPT search, Perplexity, Copilot: "Who is Chibueze Maxwell?", "What is MAXCHICHAR?", "What is RepoTrace?" | Save answers + cited URLs; same prompts each month |
| Coverage errors                         | GSC + Bing crawl reports                                                                                         | Fix within a week                                  |

Baseline (30 Oct 2026): no results for "Chibueze Maxwell" or "MAXCHICHAR" in
a third-party web search; the site is not yet visible there.

## 8. Backlog

| Pri | Item                                                                          | Done when                                                                                                      |
| --- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| P0  | Deploy edge Worker; Bing + IndexNow env                                       | All listed files return 200 live; Bing shows site verified                                                     |
| P1  | Submit sitemaps to Google and Bing                                            | Both report the sitemap read, URLs discovered                                                                  |
| P1  | Profile photo + all socials in settings                                       | Home JSON-LD includes `image` and full `sameAs`                                                                |
| P2  | ~~CollectionPage + ItemList JSON-LD on `/work`, `/research`, `/writing`~~     | Shipped (`buildCollectionPageJsonLd`); confirm in the [Schema Markup Validator](https://validator.schema.org/) |
| P2  | ~~`SoftwareSourceCode` with `codeRepository` for projects with public repos~~ | Shipped (`buildSourceCodeJsonLd`); confirm in the [Schema Markup Validator](https://validator.schema.org/)     |
| P2  | Add Organization / `worksFor` only once a venture is public and verifiable    | Entity has an official page                                                                                    |
| P3  | Monthly AI-citation prompt run (section 7)                                    | Logged results                                                                                                 |
