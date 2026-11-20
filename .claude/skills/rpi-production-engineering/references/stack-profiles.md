# Stack-specific engineering heuristics

Use these only if the inspected repository actually uses the stack. Versions evolve; verify installed toolchain and framework docs before enforcing specific rules.

## TypeScript + React / Next.js / Vite

- `strict` TypeScript where feasible; validate runtime data with actual parsers/schemas; TS types do not validate network JSON.
- Server actions/API handlers verify identity **and resource authorization**. UI hiding is not access control.
- Separate server state and local state; handle loading/error/empty, cancellation and stale writes. Avoid needless `useEffect` chains and application-wide client rendering when server approach is simpler.
- In Next.js, inspect router architecture and caching/revalidation behavior for its exact installed version. Treat SSR/server-client boundaries and server-only secrets carefully.
- Run repository-configured lint, typecheck, test, build and relevant E2E. Avoid installing extra state management or component frameworks automatically.

## Go

- Propagate `context.Context` and deadlines across requests and storage. Handle every error with useful context; avoid panic for expected errors.
- Guard concurrent shared state; run `go test` and `-race` where appropriate/supported. Bound goroutines, resources and channels; close I/O correctly.
- Define interfaces around consumers when useful, not huge future-proof service layers. Treat serialized JSON and DB values as untrusted input.
- Avoid float money, insecure crypto conveniences and fragile goroutine lifetime patterns.

## Python + FastAPI / workers

- Validate external data; use typed models where project conventions fit. Separate business logic and HTTP transport boundaries.
- Understand sync/async behavior, avoid blocking event loop, close database/session resources, set request/worker timeouts.
- Use migrations with explicit transaction/data safety and lifecycle aware background tasks. Avoid importing live side effects at module import.
- Run project's formatter/linter/typechecker, `pytest`, and dependency/security checks as appropriate.

## Rust

- Ownership helps memory safety but not authorization, logic correctness, overflow, data races across external services or DoS.
- Model expected failures with `Result`, avoid `unwrap()` on external inputs, prefer safe crates and audited ecosystem dependencies.
- Run `cargo fmt --check`, `cargo clippy`, `cargo test` where configured; consider fuzz/property tests on parsers/protocols.
- Avoid unsafe blocks unless well-justified, narrowly audited and documented.

## PostgreSQL / Drizzle / ORMs

- Enforce uniqueness/FKs/check constraints for invariants, not just application checks. Know transaction isolation and row locking when money or inventory is involved.
- Record migration compatibility, index plans, backup/restore and query performance. ORMs do not automatically protect from logical injection or cross-tenant access.
- Never drop columns/tables based on an AI-generated migration without human review and recovery planning.

## Telegram / WhatsApp bots

- Identify authenticated actor and tenancy through trusted platform IDs/verified webhook signatures where available; never trust message content for authorization.
- Make message retries idempotent, store minimal sensitive media, validate attachments and handle delayed/out-of-order webhooks.
- Include poor connectivity, rate limits, offline recovery, cost per session and privacy notices in the plan.

## Cloudflare / serverless / edge

- Confirm actual runtime limits, API compatibility, egress behavior, execution ceilings and storage consistency; don't assume Node APIs exist in edge runtime.
- Use provider-specific transactional guarantees rather than assuming all KV/blob stores support relational semantics. Bound timeouts/retries and secret scopes.
