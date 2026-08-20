# Portfolio OS

Personal engineering/research portfolio platform. Source of truth for every
architectural, product, and design decision is
**"Portfolio OS — FINAL LOCKED SPECIFICATION."** This repository implements
that specification phase by phase; nothing here should contradict it — if
you find a mismatch, the spec is authoritative and this code is wrong.

## Status: Phase 1 — Foundation (complete)

What exists:

- Next.js 16 (App Router), TypeScript strict + `noUncheckedIndexedAccess`
- Tailwind CSS v4, design tokens wired via `@theme inline` in
  `src/app/globals.css` — exact token names (`--bg`, `--accent`,
  `--accent-purple`, etc.) match §D.10 of the spec
- Self-hosted variable fonts (Fontsource): Inter Tight, Newsreader,
  JetBrains Mono — no runtime dependency on a third-party font CDN
- Static Nav / Footer shell reflecting the locked public IA (§D.8)
- A placeholder home route proving the tokens/typography render, using
  the locked eyebrow/headline copy and honest empty states — no fake
  project/research/article content
- Drizzle + drizzle-kit installed and configured (`drizzle.config.ts`),
  schema intentionally empty — the real schema (§D.3) lands in Phase 2,
  no database connection happens yet
- ESLint, Prettier (with `prettier-plugin-tailwindcss`), `.env.example`

What does **not** exist yet (by design — see spec §D.14):

- Any database connection, schema, or migration (Phase 2)
- Auth (Phase 2)
- Any CMS-driven content or admin routes (Phase 2+)
- `/work`, `/research`, `/writing`, `/now`, `/about`, `/contact` pages
  themselves — the nav links to them, they don't exist yet

## Scripts

```bash
npm run dev           # start dev server
npm run build          # production build
npm run start           # run the production build
npm run lint             # ESLint
npm run typecheck         # tsc --noEmit
npm run format             # Prettier --write
npm run format:check        # Prettier --check
npm run db:generate           # drizzle-kit generate (unused until Phase 2)
npm run db:push                 # drizzle-kit push (unused until Phase 2)
```

## Environment

Copy `.env.example` to `.env.local` and fill in values as later phases
require them — nothing in Phase 1 reads any environment variable.

## Known, accepted advisory

`npm audit` reports 4 moderate-severity findings from `drizzle-kit`'s
transitive `esbuild` dev dependency
([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)).
This affects `esbuild`'s local dev server only, not anything shipped to
production, and `drizzle-kit` is a CLI tool, not a served process. The
suggested fix (`npm audit fix --force`) downgrades `drizzle-kit` to
0.18.1, a significant regression — not worth it for a dev-only,
no-real-world-exposure advisory. Revisit if drizzle-kit ships a patched
release.
