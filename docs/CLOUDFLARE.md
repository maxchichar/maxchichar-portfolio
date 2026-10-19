# Cloudflare Workers migration (staged; no traffic cutover)

Target custom domain: `chibuezemaxwell.com` (provided by the owner). DNS attachment
and apex/www policy remain pending explicit approval.

This branch adds OpenNext for Cloudflare Workers while retaining `npm run build`,
`npm start`, the existing Vercel integration, native password hashing in Node,
and the same Neon database/schema and R2 storage. Do not delete the Vercel project.

## Deployment status and free-tier gate

The full application is **not approved for a Workers Free production cutover**.
Cloudflare currently documents 100,000 Worker requests/day, 10 ms CPU/request,
128 MB memory, and a 64 MiB Worker size limit. Static asset delivery is separate.
Check these limits again in the target account before deploying.

Password authentication uses Argon2id with existing database hashes. The Workers
build substitutes a portable verifier for the native Rust binary. A local default
hash verification used approximately 502 ms CPU; local CPU is not a hosted Workers
measurement, but the margin over 10 ms is substantial. No hash parameters or
password policy have been weakened. Cold SSR also needs hosted CPU measurements. A successful build or local preview does
not establish Free-plan CPU compatibility.

For a strict Free-only launch, resolve this gate first: move expensive password
verification to an approved external authentication service, or agree a separate
public-site/admin architecture. Either needs a deliberate follow-up change and
end-to-end authentication testing. A paid Workers plan is an alternative only
with explicit owner approval; this branch does not subscribe to one.

## Architecture

- OpenNext `@opennextjs/cloudflare`, pinned through the lockfile. Next.js is updated
  to 16.4.2 to meet the adapter's supported-version range.
- `build:cloudflare` uses webpack and an explicit Cloudflare-only native Argon2
  alias; ordinary Vercel builds retain native Argon2. Seed scripts still run in Node.
- The entrypoint creates a separate Neon pool for each request, runs Next inside
  AsyncLocalStorage, and closes the pool after the response stream completes or
  is cancelled. Transactions remain supported. Pools are never shared across
  Worker requests. Node retains its existing pooled driver.
- Existing native Argon2id PHC hashes (version 19) are verified with their stored
  memory/time/parallelism parameters. Unsupported or excessive stored parameters
  fail closed; audit actual production parameters before cutover.
- Immutable Next assets receive a one-year cache lifetime and are delivered via
  Cloudflare's distributed asset cache. Images use the existing R2 public URLs
  directly on Workers, avoiding a Cloudflare Images transformation subscription.
  The existing Vercel image optimizer remains available on Vercel.
- Dynamic HTML stays dynamic. Admin, auth, previews, actions and personalized
  responses are not placed in a shared response cache. Existing public API cache
  headers are preserved, but headers alone do not guarantee Worker response
  caching. No R2 ISR bucket, KV, Durable Objects or queues are provisioned.
- Workers serve the existing branded `public/og-default.png` at public share-image
  endpoints, cached for one hour. This avoids the dynamic renderer's local workerd
  failure and CPU cost. Page-specific dynamic share cards remain on Vercel;
  Workers use one generic branded image. Metadata titles/descriptions remain
  page-specific. No private/admin endpoint is matched by the static image rule.

## Local checks

Use Node 22 or newer and install development dependencies:

```sh
npm ci
npm run lint
npm run typecheck
npm run format:check
npm test
npm run build:cloudflare
npm run check:cloudflare
npm run preview:cloudflare
# In another terminal:
SMOKE_BASE_URL=http://localhost:8787 npm run test:e2e
```

`check:cloudflare` is a Wrangler dry run: it packages code without deploying.
`preview:cloudflare` requires a successful Cloudflare build and runs locally in
workerd. For the Vercel fallback, run `npm run build` separately; the two builds
share `.next`, so rebuild for the target you intend to run.

The Cloudflare GitHub workflow builds and packages pull requests without any
Cloudflare credentials or deployment step. Existing Vercel workflows remain.

## Configuration and secrets

Before building a real preview, supply non-secret build configuration:

- `NEXT_PUBLIC_SITE_URL`: `https://chibuezemaxwell.com` for the final domain; use
  the approved preview URL when testing a preview.
- `STORAGE_PUBLIC_URL`: the existing R2 delivery URL, used in CSP/image configuration.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, if using Turnstile.

Set runtime secrets in the target Worker, keeping their values out of Git and chat:
`DATABASE_URL`, `AUTH_SECRET`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`,
`STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, and `TURNSTILE_SECRET_KEY` if enabled.
Reuse the existing database, storage and required service credentials; do not run
schema push or seed commands as a hosting migration. Optional Resend/contact/error
alert settings are listed in `.env.example`. Keep `AUTH_SECRET` stable for the
existing auth setup. Browser sessions remain hostname-specific.

Runtime settings must also include the approved site URL and storage public URL.
Auth.js already sets `trustHost: true`. Configure `AUTH_URL` if the final deployment
needs an explicit canonical auth URL. For local preview, put test-only values in
`.dev.vars` (ignored by Git). Never use the test secret in production.

## Owner approval and deployment sequence

1. Obtain the newly purchased domain, intended apex/www hostname, and confirm the
   Workers account is on Free. Inventory DNS, email/MX records and the current
   Vercel deployment URL without editing anything.
2. Resolve the Free CPU/auth gate above. Review the draft PR and verify both
   Cloudflare and Vercel builds. Do not merge while the Free requirement is unresolved.
3. Obtain Cloudflare authorization through Wrangler OAuth (`npx wrangler login`)
   or a securely supplied scoped API token. Do not paste tokens in the PR or chat.
   A Workers deployment token needs access to the selected account and Workers
   scripts; grant additional DNS/zone access only for a separately approved cutover.
4. After explicit approval, provision secrets for the selected preview Worker and
   deploy to `workers.dev`. The configuration deliberately contains no DNS routes
   or custom domains. Confirm the worker name and self-reference service match.
5. Test real Neon reads and transactions in an isolated test database, existing
   password login/wrong password/lockout/signout, protected-route denial, drafts,
   contact submission and Turnstile, R2 upload/confirm, downloads, CSP, images,
   SEO URLs, and streamed responses. Local tests without credentials only cover
   fallback pages and the auth boundary, not real database/auth integration.
6. Inspect hosted CPU/startup/memory/error metrics, verify the account's Free
   limits, asset cache headers and geographic performance. A preview that exceeds
   Free limits must not receive production traffic.
7. Request explicit approval for the exact domain/DNS/traffic change. Update
   canonical URLs, Turnstile allowed hosts and verified mail sender settings as
   needed, rebuild, then attach the approved custom domain. Preserve mail DNS.
8. Monitor after cutover. Retain the Vercel deployment and access credentials.
   Rollback: restore the captured domain routing to Vercel, restore canonical and
   Turnstile settings if changed, and verify production. Shared Neon/R2 data needs
   no reverse migration; this branch changes no schema or stored password hashes.

## References

- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://opennext.js.org/cloudflare/get-started
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
