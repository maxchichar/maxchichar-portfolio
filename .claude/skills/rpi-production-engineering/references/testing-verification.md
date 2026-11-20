# Testing and verification playbook

Testing is **evidence about behavior under specific conditions**, not proof of general correctness. Report exactly what ran in the actual environment, with timestamp/commit/version when meaningful. Do not imply a test passed because a test file exists.

## Traceability strategy

Map each acceptance criterion to a test/assertion, changed implementation and observed result. Consider:

- **Static:** format, lint, typecheck, compilation, dependency/secret scan, diff review.
- **Unit:** domain rules, state transitions, boundary parsing, data normalization, pure functions.
- **Integration:** DB constraints/transactions, provider mocks with contract fidelity, auth middleware + persistence, local queues/files.
- **Contract:** request/response shape, backward compatibility, error status, webhook signatures, event schema, client/server version skew.
- **End-to-end:** a few high-risk user journeys, accessibility, realistic failure flows and real browser behavior.
- **Nonfunctional:** security adversarial cases, latency at representative distribution, throughput with contention, resource budgets, disaster recovery drills (critical).
- **AI-specific:** held-out eval sets, prompt-injection cases, tool permissions, regression across model/provider changes, toxicity/privacy where relevant.

## Test quality

Prefer deterministic fixtures and isolated resources. Use stable clocks and seeded random behavior; mock at external boundaries, not everywhere. Test concurrency with controlled barriers or repeated scenarios rather than sleep-based lottery. Avoid assertion-free smoke tests and snapshots of irrelevant markup. Ensure a failed assertion actually fails CI; inspect flakiness instead of blindly rerunning until green.

## Evidence record

For each run save: exact command, working directory, revision/runtime, environment type, date, exit status, relevant output, failures and skip counts. A shell snippet with no observed output is only a proposal. Tests after the last code modification matter more than tests from before it. Don't commit secrets/PII to captured logs.

Suggested local proof capture (choose safe directory and inspect for secrets first):

```bash
mkdir -p docs/rpi/<task>/proof
# run project-specific test command; tee with pipefail to preserve failure status
set -o pipefail
npm test 2>&1 | tee docs/rpi/<task>/proof/tests.log
```

`<task>` is a placeholder, not a literal folder. Use `pytest`, `go test`, `cargo test`, relevant build script or equivalent based on detected project; never run `npm test` blindly without checking scripts.

## Failure matrix

| Layer | Positive | Failure/adversarial |
| --- | --- | --- |
| Request | valid input | missing/huge/malformed fields; duplicate; expired auth |
| Authorization | permitted actor | IDOR, cross-tenant ID, role tampering, stale membership |
| Persistence | commit and read | unique conflicts, rollback, concurrent writes, partial failure |
| Third-party | valid response | timeout, retry-after, webhook replay/out-of-order, 500 |
| Browser | happy path | offline, slow loading, keyboard, 320px/large font, screen reader |
| AI | approved use | injected instructions, hallucinated citations, disallowed tool calls, cost spike |
| Operations | healthy | dependency down, resource exhaustion, kill-switch, rollback |

## Release classification

- **VERIFIED LOCALLY:** all required local acceptance checks observed passing; no claim of deployment.
- **STAGING VERIFIED:** exact tested deployment in a staging environment, with linked evidence.
- **PRODUCTION VERIFIED:** production deployment actually completed with authorized evidence and post-release monitoring checks.
- **PARTIAL / NOT RELEASE READY:** blockers, unrun critical checks or absent permission; record specific consequences.

Coverage percent without a meaningful risk-based test matrix is not sufficient. Never report production-grade solely because tests are green.
