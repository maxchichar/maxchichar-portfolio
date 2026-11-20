# Engineering review scorecard and signoff

The scorecard is a decision aid, **not a magic numerical grade**. A critical auth flaw blocks release even if every other dimension scores well. Use explicit severity findings and links to evidence.

## Six lenses

1. **Correctness:** solves the user problem, covers edge/negative flows, invariants, compatibility.
2. **Security/privacy:** authentication, tenant/object authorization, injection/SSRF/XSS, secrets, data collection/retention, third parties.
3. **Reliability/data:** concurrency, idempotency, retries, partial failure, migration and recovery.
4. **Operability/performance:** relevant telemetry, error budgets, incident response, capacity/cost, resource bounds.
5. **Experience/accessibility:** clarity, states, performance, responsive, keyboard and assistive technology.
6. **Maintainability:** module boundaries, readability, typed contracts, test determinism, dependency cost, reversible design.

## Findings format

Use `BLOCKER / HIGH / MEDIUM / LOW`, exact location, reproducible scenario, impact, confidence, proposed fix, owner and verification. No fabricated line numbers. If it cannot be reproduced, clearly indicate inferred rather than observed.

Example:

```text
HIGH — GET /orgs/:orgId/invoices
Observation: handler fetches invoice by ID but does not scope by active org.
Impact: authenticated tenant may read another tenant's invoice.
Reproduction: attempted ID swap in integration environment [attach result].
Fix: scope query by server-derived tenant; negative integration assertion.
State: unresolved → NOT RELEASE READY.
```

## Audit disclosure

Report whether code inspection, unit tests, integration tests, E2E, security scan, independent review, staging tests and production post-release verification were **actually done**, each with result and evidence. A self-review is still self-review. Missing evidence cannot be upgraded to "passed".

## Definition of done by tier

**Patch:** scoped fix, focused acceptance test, working tree review, honest outcome.

**Standard:** all patch items plus negative/regression coverage, contracts, relevant UX/security checks, clear operational/release plan and handoff.

**Critical:** all standard items plus reviewed threat model, attributable approval, adversarial/integrity/concurrency tests, independent review when feasible, rollback/recovery validation, staged rollout/monitoring and owner. Unavailable reviewers are a documented block or an accountable risk decision by an actual authorized party, not an agent waiver.
