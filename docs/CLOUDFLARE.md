# Public portfolio on Cloudflare; admin on Vercel

Target public domain: `chibuezemaxwell.com`. Admin/login remain at
`https://chibuezemaxwell.vercel.app/admin`. DNS and production cutover require
separate owner approval. Do not remove the Vercel project or change mail DNS.

## Architecture

- Cloudflare Workers uses OpenNext 1.20.12 and supported Next.js 16.4.2.
- On Workers, GET/HEAD requests to `/admin` and `/preview` redirect to the same
  path on Vercel. POST requests to those paths are rejected, never forwarded.
  `/api/auth` and `/api/media` are unavailable on Workers. Sessions, sign-in,
  lockout, password hashing, protected mutations, uploads and drafts stay on Vercel.
- A Cloudflare-only auth module always returns no session and refuses sign-in.
  This also denies protected Server Actions invoked through public URLs, rather
  than relying only on redirects. Native Argon2 and Auth.js login remain on Node.
- Both hosts use the same Neon database and R2 objects. Content published on
  Vercel is read by Cloudflare; this migration does not copy data or change schema.
- Workers use one Neon transaction pool per request, propagated through
  AsyncLocalStorage and closed when the response stream completes or is cancelled.
  Vercel retains its existing Node pool.
- Immutable Next assets use Cloudflare's globally distributed asset cache with a
  one-year lifetime. Workers serve existing R2 original images directly, without a
  Cloudflare Images subscription. Public share-image endpoints serve the existing
  branded `og-default.png`, cached for one hour. Vercel keeps dynamic share images.
- Dynamic HTML remains dynamic; admin, auth, drafts and personalized responses
  are never placed in a shared cache. Existing API cache headers alone do not
  guarantee Worker response caching. No R2 ISR, KV, queues or Durable Objects are
  provisioned.

## Free-plan gate

The password CPU blocker is removed from Workers by keeping authentication on
Vercel. Hosted public SSR CPU, cold starts, memory and account limits still need
measurement before production traffic moves. A local build/preview does not prove
Free-plan compatibility. Current documented limits include 100,000 Worker
requests/day, 10 ms CPU/request, 128 MB memory and a 64 MiB Worker bundle. Recheck
limits in the target account. Static asset delivery has separate limits.

No paid plan is enabled by this branch.

## One-time admin account setup

An Auth.js Credentials form does not automatically create an account. The admin
email and an Argon2id password hash must exist in `users` in the database used by
Vercel. Adding ADMIN_EMAIL/ADMIN_PASSWORD to Vercel alone does not create that row.

For an operator running locally with database access in ignored `.env.local`:

```sh
npm ci
npm run setup:admin
```

The setup asks for an email and a password twice in a hidden terminal prompt.
It requires at least 16 password characters, stores only an Argon2id hash, and
refuses to overwrite any existing account. The password is never printed or saved
to an environment file. Use the chosen credentials at the Vercel admin login.
Never deploy a public bootstrap/signup endpoint for this single-admin site.

The older `seed:admin` script can reset an existing password and clear lockout.
Use it only for an explicitly requested reset, not routine deployment. Do not run
any account or schema seed automatically as part of builds.

## Configuration

`wrangler.jsonc` sets `ADMIN_ORIGIN` to the verified Vercel production origin.
Keep it as a separate HTTPS origin to avoid a redirect loop. There are no custom
DNS routes in this configuration. Preview deployment initially uses workers.dev.

Build configuration for the public Worker:

- `NEXT_PUBLIC_SITE_URL`: the approved preview URL initially, then
  `https://chibuezemaxwell.com` at final cutover.
- `STORAGE_PUBLIC_URL`: the existing public R2 delivery origin (also used in CSP).
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, if the contact form uses Turnstile.

Workers need the existing `DATABASE_URL` and optional contact/Resend/Turnstile/error
alert settings for public functionality. Consult `.env.example`. Keep admin auth
and storage-upload credentials on Vercel; do not transfer ADMIN_PASSWORD or
AUTH_SECRET to the public Worker for this split. Vercel retains its current
DATABASE_URL, AUTH_SECRET, R2 credentials and any other required settings.

On Vercel, Auth.js uses its Vercel origin for login/cookies (or an explicit
`AUTH_URL=https://chibuezemaxwell.vercel.app` if needed). The public canonical site
URL and the authentication origin are separate settings. Cookies are host-specific;
Cloudflare does not proxy admin requests or receive Vercel session cookies.

`.dev.vars` and `.env.local` are ignored. Use only test secrets locally. Never put
credentials in Git, a PR, or chat.

## Validation and deployment

```sh
npm ci
npm run lint
npm run typecheck
npm run format:check
npm test
npm run build:cloudflare
npm run check:cloudflare
npm run preview:cloudflare
SMOKE_BASE_URL=http://localhost:8787 npm run test:e2e
```

`check:cloudflare` packages without uploading. The compatibility workflow builds
and dry-runs PRs with no Cloudflare deployment credentials. Vercel workflows stay
in place. Verify the Vercel fallback separately with `npm run build`. The builds
share `.next`, so do not rebuild while a local preview smoke test is running.

Before cutover:

1. Review the PR, create the owner admin account, and verify sign-in on Vercel.
2. Obtain Cloudflare authorization securely through Wrangler OAuth or a scoped
   token. The previously available authorization was expired. Never paste tokens
   in chat. Confirm the selected Workers account is on Free.
3. With explicit preview approval, provision required public runtime settings and
   deploy to workers.dev. Do not attach the custom domain yet.
4. Verify real public database reads/contact functionality, Vercel admin login,
   published content appearing publicly, drafts/uploads remaining on Vercel,
   API/private-route denial on Workers, canonical URLs, CSP, share images and
   geographic performance. Inspect hosted CPU/memory/startup/error metrics.
5. Obtain approval for the exact DNS/domain and traffic change. Capture original
   routing, preserve mail records, update public canonical/Turnstile host settings,
   rebuild, then attach `chibuezemaxwell.com` using the approved apex/www policy.
6. Keep Vercel available. Roll back by restoring captured domain routing and any
   changed canonical/Turnstile settings. Shared Neon/R2 data needs no reverse
   migration, and Vercel admin remains usable during a public-site rollback.

## References

- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://opennext.js.org/cloudflare/get-started
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
