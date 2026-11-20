# Data, API contracts and migrations playbook

## Data modeling

Identify aggregate ownership and source of truth. Define each table/entity by identity, lifecycle, constraints, tenancy, uniqueness, nullability, time source, retention and deletion behavior. Enforce critical invariants at DB boundaries when supported. Avoid schema-first features with no workflow and avoid app-only uniqueness constraints vulnerable to concurrency.

## Transactions, consistency and retries

Describe where atomicity begins/ends and what cannot be included in one transaction. For external effects use durable outbox/inbox or idempotent state transitions when warranted. Distinguish at-least-once delivery from exactly-once business effect (which typically requires idempotency). Handle isolation anomalies and TOCTOU when double-spend/oversell is possible. Never perform a money movement twice because a HTTP request was retried.

## API contracts

Use versioned typed schemas and explicit error semantics. Include validation, authorization, pagination/order/cursors, idempotency keys, conditional update/version checks, rate limiting, caching invariants and tracing. Do not leak internal exception details. For backwards compatibility, analyze both old client/new server and new client/old server windows.

Example invariant: `POST /invoices/{id}/pay` cannot confirm payment from browser payload; finalize only with verified provider settlement and consistent ledger state.

## Migration decision tree

- If purely additive and small: add migration, compatibility test and normal rollback of application code.
- If changing data semantics: expand schema, dual-write only where justified, idempotent/backfillable migration, cutover checks, observe, contract later.
- If destructive: explicit impact report, signed approval where policy mandates, restore exercise, feature freeze and data retention check.
- If large table: assess index creation mode, lock duration, write amplification, batch sizes, long transactions and replication lag.

A down migration may **not** restore lost data. Never represent code rollback as database restoration. Test with realistic volume/anonymized fixtures, avoid production copies containing personal information outside approved boundaries.

## Finance and ledger patterns

Prefer append-only journal entries with compensating entries, explicit currency minor units/decimal semantics, source event IDs, actor/authorization, immutable history and reconciliation. Separate authorization, booking, settlement, reversal and refund; make state transitions auditable and idempotent. Validate Nigerian Naira formatting only as a locale concern, not a justification to use floats for money.

## Integrity checks

- unauthorized cross-tenant access fails;
- duplicate/reordered events yield correct state;
- concurrent operations preserve uniqueness/balance invariants;
- failed downstream call does not leave hidden partial commit;
- historical records remain interpretable across schema evolution;
- backups and recovery actually work for data criticality.
