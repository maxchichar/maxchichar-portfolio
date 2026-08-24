# Portfolio OS

Personal engineering/research portfolio platform. Source of truth for every
architectural, product, and design decision is
**"Portfolio OS — FINAL LOCKED SPECIFICATION."** This repository implements
that specification phase by phase; nothing here should contradict it — if
you find a mismatch, the spec is authoritative and this code is wrong.

## Status: Phase 2 — Database + Auth (complete)

Phase 1 (Foundation) is unchanged and still in place — see git history / prior
delivery for that summary.

What exists:

- Full 21-table schema in `src/lib/db/schema.ts`, matching the locked
  specification: `users`, `api_keys`, `media`, item/version pairs for
  projects/research/articles/pages, `tags` + 3 join tables, `evidence` + 2
  join tables, `site_settings`, `contact_submissions`, `audit_logs`.
  Migration generated and applied to a real local Postgres for
  verification: 32 foreign keys, all CHECK constraints (including a
  DB-level guard that `api_keys.scopes` can never contain
  `content:publish`), partial unique indexes enforcing "at most one
  published version" and "at most one open draft" per content item, and
  generated `tsvector` search columns — all confirmed to actually exist in
  Postgres, not just assumed from the TypeScript.
- **Auth.js v5, Credentials provider, Argon2id, JWT sessions** — see
  "Architecture correction" below; this changed from the originally locked
  "database sessions" during Phase 2 because Auth.js doesn't support that
  combination with a Credentials-only provider.
- DB-backed login lockout (5 failed attempts → 15 minute lock via
  `users.failed_login_count` / `locked_until`), verified end-to-end
  against a real database, including confirming the correct password is
  still rejected while locked.
- `/admin/login` and route-protected `/admin` (via a route-group layout
  that calls `auth()` server-side on every request — the authoritative
  check, not middleware/UI hiding).
- Idempotent admin seed script (`npm run seed:admin`), verified to skip
  cleanly on a second run and to never log the password.
- `src/lib/db/index.ts` — server-only, Neon serverless driver
  (WebSocket/`Pool`, needed for real transactions later), guarded so it
  never connects or throws at build time without a real `DATABASE_URL`.

### Architecture correction made during Phase 2

The original spec locked "Auth.js database sessions backed by our own
`sessions` table." That combination — Credentials provider + database
session strategy — is not supported by Auth.js; it throws
`UnsupportedStrategy` unconditionally when every configured provider is
Credentials and the session strategy is `"database"` (verified against
`@auth/core`'s source, not assumed). The fix: **JWT sessions**, per an
explicit decision to take the fully-supported path rather than work around
Auth.js internals. The `sessions` table was removed from the schema
entirely — it had no purpose once nothing reads or writes it, and the spec
explicitly prefers dropping dead infrastructure over keeping a
falsely-described table around. Full detail and the options considered are
in the conversation; this is the summary for anyone reading the code cold.

What does **not** exist yet (by design — see spec §D.14):

- Any CMS-driven content, editors, or admin routes beyond the bare
  authenticated shell proving login works
- Media upload/processing, Cloudflare R2 integration
- `/api/content/v1/*`, API-key routes (table exists, unused)
- `/work`, `/research`, `/writing`, `/now`, `/about`, `/contact` pages
  themselves

## Phase 2 — Neon Verification

- **Local Postgres verification passed previously.** Schema, migrations,
  constraints, the full auth flow (login/logout/lockout), and idempotent
  seeding were all verified end-to-end against a real local Postgres
  instance, using a temporarily-swapped `node-postgres` driver (reverted
  before shipping) since the real driver can't reach a plain local
  Postgres — it speaks Neon's WebSocket proxy protocol, not raw TCP.
- **Production driver is `@neondatabase/serverless` via
  `drizzle-orm/neon-serverless`** — this is what ships in
  `src/lib/db/index.ts` and what the verification scripts below exercise.
  It has not been swapped, and these scripts don't swap it either.
- **Real Neon verification is still pending.** No `DATABASE_URL` has been
  supplied in any environment this project has run in so far, and no
  environment used for development has had network access to any
  `*.neon.tech` host.
- Running the scripts below is what verification requires — a reachable
  Neon project and a real `DATABASE_URL` (plus `AUTH_SECRET`,
  `ADMIN_EMAIL`, `ADMIN_PASSWORD`). No claim of "verified against Neon"
  should be trusted until these have actually been run and reported PASS.

### Running it

```bash
# One-shot, runs Database -> Seed -> Authentication -> Application in order
DATABASE_URL=... AUTH_SECRET=... ADMIN_EMAIL=... ADMIN_PASSWORD=... \
  VERIFY_ADMIN_EMAIL=... VERIFY_ADMIN_PASSWORD=... \
  npm run verify:neon

# Or individually:
npm run verify:neon:db     # schema/migration/constraints only
npm run verify:neon:auth   # full HTTP auth flow (builds + boots the app)
```

The auth flow runs as **two separate, clearly-labeled tests**:

- **Test A** hits the raw Auth.js framework endpoint
  (`/api/auth/callback/credentials`) directly — a framework/DB-layer sanity
  check. Expects `error=CredentialsSignin` on failure (Auth.js's own
  default), since this bypasses the product's login page entirely.
- **Test B** reproduces the real product login flow: it fetches
  `/admin/login`, extracts the actual Next.js Server Action reference the
  page renders, and submits the real multipart form — exactly what a
  browser sends, not a reimplementation. Expects `error=1` on failure,
  because `src/app/admin/login/page.tsx`'s own catch block deliberately
  collapses every `AuthError` to that generic value. **Test B is the one
  that actually proves the product works** — Test A only proves the layer
  underneath it.

`ADMIN_EMAIL`/`ADMIN_PASSWORD` are only ever used on the success path
(correct credentials). Every failing/lockout-triggering attempt uses a
**separate** `VERIFY_ADMIN_EMAIL`/`VERIFY_ADMIN_PASSWORD` account instead,
created automatically if it doesn't exist and reset before and after every
run — so the real admin account is never subjected to a failed attempt and
can never end up locked by running verification.

Every check prints one of:

- `PASS <check>` — actually ran against the configured database and succeeded
- `FAIL <check> — <reason>` — actually ran and failed
- `BLOCKED <reason>` — could not run at all (missing env var, unreachable
  host, bad credentials) — printed once, nothing after it is attempted

`npm run verify:neon` exits non-zero unless every check PASSes. It never
falls back to a local database, never swaps the driver, and never mocks
Neon — if `DATABASE_URL` is missing or unreachable, it stops immediately
and says so.

```bash
npm run dev           # start dev server
npm run build          # production build
npm run start           # run the production build
npm run lint             # ESLint
npm run typecheck         # tsc --noEmit
npm run format             # Prettier --write
npm run format:check        # Prettier --check
npm run db:generate           # drizzle-kit generate
npm run db:push                 # drizzle-kit push
npm run seed:admin                # create the one ADMIN user (idempotent)
npm run verify:neon:db              # Neon schema/migration checks (needs DATABASE_URL)
npm run verify:neon:auth              # Neon auth-flow checks (needs DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD)
npm run verify:neon                     # both, in order — see "Phase 2 — Neon Verification" below
```

## Environment

Copy `.env.example` to `.env.local` and fill in real values: `DATABASE_URL`
(a Neon Postgres connection string), `AUTH_SECRET` (Auth.js session
encryption key), and `ADMIN_EMAIL` / `ADMIN_PASSWORD` for the one-time
`npm run seed:admin` run. Run `npm run db:push` (or generate + apply a
migration) before seeding.

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
