# MAXCHICHAR Portfolio OS — Production Deployment & Operations Runbook

This document defines the production hosting architecture, deployment procedures, operational verification commands, and lifecycle policies for the MAXCHICHAR Portfolio OS.

---

## 1. Production Architecture

The system operates on a zero-server-maintenance, serverless architecture:

- **Hosting & Compute**: Next.js 16 (App Router) running on Vercel Node 24 runtime with Turbopack.
- **Database**: PostgreSQL on Neon Serverless (`@neondatabase/serverless`), utilizing WebSocket connection pooling (`-pooler` endpoint) and TLS enforcement (`sslmode=require`). Real transactions and Drizzle ORM schema mapping.
- **Authentication**: Auth.js (NextAuth v5 beta), Credentials provider with Argon2id password hashing, stateless JWT session tokens (no database session adapter), and database-enforced login lockout (`users.failed_login_count`, 5 attempts → 15-minute lock).
- **Object Storage**: Cloudflare R2 (S3-compatible API). Direct browser-to-bucket uploads via presigned URLs; server-side byte sniffing (magic bytes) upon confirmation.
- **Media Delivery CDN**: Cloudflare R2 public development URL (`R2.dev`), delivering immutable assets directly to web browsers without AWS SigV4 signatures or application proxying.

---

## 2. Production URLs & Domains

- **Canonical Site Origin**: `https://chibuezemaxwell.vercel.app` (configured as `NEXT_PUBLIC_SITE_URL`). This is the only production domain; the former `chibueze-maxwell.vercel.app` alias has been retired.
- **Public Media CDN Origin**: `https://pub-be5b26d4fdc14d42a7bfa1843c84c207.r2.dev` (configured as `STORAGE_PUBLIC_URL`)

---

## 3. Required Environment Variables

All variables are scoped strictly to **Production** on Vercel:

| Variable Name          | Description                                                                  | Sensitivity |
| :--------------------- | :--------------------------------------------------------------------------- | :---------- |
| `DATABASE_URL`         | Neon pooled PostgreSQL connection string (`-pooler`, TLS required)           | **Secret**  |
| `AUTH_SECRET`          | 32+ character high-entropy secret for Auth.js JWT signing                    | **Secret**  |
| `STORAGE_ENDPOINT`     | Cloudflare R2 S3 API endpoint (`https://<account>.r2.cloudflarestorage.com`) | **Secret**  |
| `STORAGE_ACCESS_KEY`   | Cloudflare R2 API Access Key ID                                              | **Secret**  |
| `STORAGE_SECRET_KEY`   | Cloudflare R2 API Secret Access Key                                          | **Secret**  |
| `STORAGE_BUCKET`       | Target Cloudflare R2 bucket name (`maxchichar-portfolio-media`)              | Config      |
| `STORAGE_PUBLIC_URL`   | Public HTTPS base URL for R2 CDN media delivery (no trailing slash)          | Config      |
| `NEXT_PUBLIC_SITE_URL` | Canonical site origin (no trailing slash, HTTPS)                             | Config      |

> [!CAUTION]
> Never commit `.env.local` or print raw secret values to logs. `.env.example` provides the sanitized template.

---

## 4. Deployment Process

Deployments to Vercel Production are executed via the Vercel CLI from an audited, committed repository tree:

```bash
# 1. Run local verification gates
npm run verify:phase10:preflight
npm run verify:phase10:config
npm run typecheck
npm run lint
npm run build
npm run verify:neon:db

# 2. Deploy to Vercel Production
npx vercel --prod --yes

# 3. Verify live production
npm run verify:phase10:production
```

---

## 5. Verification Commands

The repository provides automated verification suites covering every tier:

- `npm run verify:phase10:preflight`: Validates release freeze, `.gitignore`, `.env.example`, Next.js security flags, and public route trees.
- `npm run verify:phase10:config`: Audits remote and local environment variables against the formal configuration contract.
- `npm run verify:phase10:production`: Audits the live production deployment across 10 security and integrity suites (status codes, canonicals, robots, dynamic sitemap, security headers, CSP, admin boundaries, 404 safety).
- `npm run verify:phase10:r2-e2e`: Executes an end-to-end media upload roundtrip (presign → R2 PUT → server confirmation → magic-byte validation → public CDN GET delivery → safe deletion).
- `npm run verify:neon:db`: Validates Neon PostgreSQL 21-table schema, 32 foreign keys, 137 CHECK constraints, partial unique indices, and tsvector search columns.
- `npm run verify:phase9`: Comprehensive SEO, Open Graph, metadata, and security headers runtime matrix.
- `npm run verify:phase10`: Master non-destructive production release gate.

---

## 6. Cloudflare R2 Media Architecture

```
[Browser]
   │
   ├─ 1. POST /api/media/upload-request ──> [Next.js Server] (validates MIME/size, inserts PENDING row)
   │                                              │
   │<────────── Returns presigned S3 PUT URL ─────┘
   │
   ├─ 2. Direct PUT binary bytes ─────────> [Cloudflare R2 Bucket (Private S3 API)]
   │
   ├─ 3. POST /api/media/[id]/confirm ────> [Next.js Server]
   │                                              │
   │                                              ├─ Fetches real bytes via S3 API
   │                                              ├─ Sniffs magic bytes via file-type
   │                                              ├─ Validates dimensions via image-size
   │                                              └─ Updates status to READY
   │
   └─ 4. Unauthenticated Public GET ──────> [Cloudflare R2.dev CDN] (via STORAGE_PUBLIC_URL)
```

- Public URLs are derived dynamically: `${STORAGE_PUBLIC_URL}/${storageKey}`.
- Deletions are safe and atomic: reference checks block deletion if media is attached to projects, research, articles, evidence, or settings; database row is removed first, then the R2 object is deleted.

---

## 7. Database Migration & Schema Integrity

- Drizzle ORM manages database schema definitions in `src/lib/db/schema.ts`.
- Migrations are tracked in `drizzle/` and applied idempotently via Neon serverless drivers.
- Content tables follow an **item/version split**:
  - `projects` / `project_versions`
  - `research` / `research_versions`
  - `articles` / `article_versions`
  - `pages` / `page_versions`
- Partial unique indexes enforce at most **one PUBLISHED** and **one DRAFT** version per item.
- Evidence rows are item-level, unversioned, and strongly validated per type.

---

## 8. Rollback Principles

- **Code / Hosting Rollback**: Revert Vercel deployment instantly via Vercel Dashboard or CLI (`vercel rollback`), pointing traffic back to the previous immutable deployment hash.
- **Content Rollback**: Restore-forward lifecycle. To rollback published content, the target historical version is cloned into a new `DRAFT`, reviewed, and published. History is never mutated in-place.
- **Database Rollback**: Backwards-compatible migrations only (expand-contract). Columns are deprecated before removal. Neon instant point-in-time branch restores provide point-in-time disaster recovery.

---

## 9. Admin & Security Operational Notes

- **Admin Path**: `/admin/login` (unauthenticated requests to `/admin/*` redirect with HTTP 307).
- **Initial Admin Seeding**: Run `npm run seed:admin` using configured `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- **Brute Force Lockout**: 5 failed login attempts trigger an automatic 15-minute lock on the account.
- **Security Headers**: Injected on all routes via `src/lib/security-headers.ts` and `next.config.ts`:
  - `Content-Security-Policy`: strict `default-src 'self'`, `object-src 'none'`, `frame-src 'none'`, explicit R2 CDN origins.
  - `Strict-Transport-Security`: `max-age=31536000; includeSubDomains`.
  - `X-Frame-Options: DENY`.
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `X-Powered-By`: Suppressed.

---

## 10. Phase 11 Prohibition & Boundaries

- **Phase 11 (AI Integration / Content API)** is locked and strictly **NOT STARTED**.
- As established in `docs/SPECIFICATION.md` (lines 41–43 and 115), Phase 11 may only begin when explicitly requested by the site owner.
- The `api_keys` table contains a database-level `CHECK` constraint barring `content:publish` from ever being granted to an automated API key. Publishing remains human-session-only by structural invariant.
