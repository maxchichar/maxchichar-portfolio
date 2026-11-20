# Phase P: Planning playbook

## Non-negotiable property

A plan is good only when implementation and falsification can follow it. Avoid plans composed of vague verbs such as "optimize", "ensure scalability" or "make secure" without tests or design consequences.

## 1. Write a constrained design brief

- **Intent:** problem and target actors, baseline, user/business measure.
- **Scope:** exact capabilities, explicit non-goals, blast radius.
- **Acceptance:** observable Given/When/Then (or equivalent), including error and permission scenarios.
- **Constraints:** existing stack, infrastructure, cost, deadlines, offline/network reality, accessibility and data residency as applicable.
- **Assumptions:** each with validation route and failure consequence.
- **Capacity:** expected load and peak order-of-magnitude, without fictional benchmarks.

## 2. Architecture through boundaries

Define the request/data path using a plain text diagram. For example:

```text
[Browser] -- validated request --> [API/AuthZ] -- transaction --> [Postgres]
   ^                                  |                         |
   |---- response/error + ID ---------|------ outbox event -----|
                                               |
                                            [Worker]
```

Specify: what owns truth; invariant that must always hold; where authorization executes; trust boundaries; idempotency and retry rules; async ordering; transaction isolation where critical; serialization/versioning; error codes; cost/security/performance limits; maintenance ownership. Define API contracts with typed schemas and examples before writing consumers and producers independently.

## 3. Alternatives / ADRs

For high-impact choices, write an ADR: problem, decision drivers, considered options, choice, tradeoffs, reversal strategy, rejection reasons and decision owner. Do not anchor only on pros; identify why the chosen option is likely wrong and what evidence would reverse it. See [architecture-decisions](architecture-decisions.md).

## 4. Implementation slices

Plan **vertical** slices delivering testable behavior:

1. Add failing test or reproduction proof.
2. Minimal implementation and relevant contract adjustments.
3. Negative and boundary tests for authorization, malformed input and retries.
4. Migration compatibility or flag as relevant.
5. Observe functionality with actual feedback and widen validation.

Each slice has file touchpoints, tests, proof, estimated risk (not fictitious hours), dependency and fallback. Never mix cosmetic UI redesign with auth changes unless coupled by requirement.

## 5. Verification matrix

For each acceptance criterion map:

| Requirement | Code area | Positive | Negative/adversarial | Evidence |
| --- | --- | --- | --- | --- |
| Org members only see their invoices | Query and handler | own-org access | cross-org ID probe | unit + integration log |
| Duplicate webhook produces one credit | webhook + ledger | first event | replay/parallel duplicate | deterministic concurrency test |

Include realistic accessibility checks for UI, performance budgets where meaningful, data integrity checks, operational telemetry and manual flows if automation cannot cover them. Tool-generated coverage metrics do not equal useful validation.

## 6. Security + privacy by design

For sensitive work, draw boundaries, list assets/actors/entry points, threats, controls and tests. Include authorization on each resource, token storage, key rotation if relevant, input/output encoding, injection, SSRF, CSRF, data retention/deletion, secure logging, least privilege and third-party exposure. See [security-privacy](security-privacy.md).

## 7. Safe release and failure plan

- Backward-compatible expand → backfill → contract for live schema changes.
- Feature flags with owner and expiration, staged rollout/canary, stop signal and kill switch when justified.
- Startup/readiness checks, dashboards/traces/log correlation, SLO/error budget if applicable.
- Rollback procedure **tested against current state** or labeled untested, restore path for irreversible data migrations.
- Migration lock/timeouts, indexes and table size constraints; backup/restore rehearsal for critical changes.
- Approval record attributable to authorized humans, not generated from the assistant's own output.

## Planning gate failure examples

- "We can secure it later" on payment or cross-tenant flows.
- No decision about idempotency for externally retried financial actions.
- Writing UI without empty/error/loading/keyboard/small-screen states.
- New queue/microservice without a quantified need and operator.
- Claiming rollback exists when schema migration destroyed data.
- Plan omits how to tell whether change actually works.

The plan should be concise enough to execute, but no shorter than the risk requires. Use `assets/templates/plan.md` and `assets/templates/traceability.csv` where coordination warrants them.
