# Phase I: Implementation playbook

## Start-of-change protocol

1. Verify the intended scope and gate outcome. Read actual project instructions and `git status` to protect uncommitted user work.
2. Select worktree/branch strategy according to repo policy; never invent a clean tree.
3. Confirm test/runtime availability and compatibility from lockfiles/manifests. Avoid unreviewed dependency updates.
4. Capture existing failing behavior or baseline, and note checks that cannot run. Begin with the narrowest slice.

## Engineering defaults

- Prefer clear names, cohesion, small modules, explicit interfaces, explicit errors, typed boundaries and simple control flow. Avoid speculative abstractions, magic flags and hidden global state.
- Validate at trust boundaries; clients can aid UX but server authority owns security. Authenticate identity then authorize the **specific action against the specific resource**. Deny by default.
- Model domain invariants explicitly, including state transitions, versioning, race conditions and conflict handling. Use proper database constraints as final guardrails where relevant.
- Build retries around idempotency and finite deadlines. Backoff with jitter where appropriate; bound concurrency and queues. Do not retry a non-idempotent payment without provider semantics.
- Use stable migration/change interfaces; do not silently break prior clients or mutate historical financial records. Secrets stay in secret managers/env injection, never committed.
- Preserve project coding conventions unless technically unsafe. Do not use a wholesale reformat to disguise unrelated changes.
- Enforce reasonable resource budgets and cleanup for files, CPU, memory, connections, network and AI inference.

## Slice loop

```text
choose small acceptance criterion
→ inspect existing code/contract
→ write failing scenario when possible
→ implement smallest safe change
→ run focused tests & static checks
→ inspect diff for scope/security/regression
→ correct, document, capture proof
→ repeat
```

If test can't run, do not create imaginary output. Document environment/config blockers and use static reasoning as a lower-confidence fallback. Avoid rewriting tests to reflect buggy new implementation; first ask whether the spec changed.

## Production disciplines

- **Security:** no debug backdoors, secrets, bypass auth, trusting client prices, raw concatenated SQL/HTML, remote shell evaluation or blanket CORS. Test least-privilege and failure cases.
- **Data:** explicit schema validation, parameterized queries, indexes linked to query pattern, transaction boundaries, pagination and consistent timestamps. Check data migration reversibility and backfill.
- **Quality:** deterministic unit tests, integration with realistic dependencies, contract/API tests, end-to-end for high-value paths, negative tests, types/lint/build where available.
- **UI:** usable empty/loading/error/success flows, keyboard focus, semantic controls, mobile/responsive and accessible contrast. Measure rather than declare "premium".
- **Operations:** structured logs with correlation identifiers but no sensitive payload, error rate, latency, saturation/resource gauges as applicable; timeouts, rate limits, graceful degradation and runbook.
- **Supply chain:** review dependency origin/licensing, avoid unpinned deploy artifacts when immutable artifacts are expected, use CI with restricted credentials.

## Change review

Compare diff to scope, investigate surprising file touches. Review for unintended data exposure, logging PII, hard-coded config, unbounded loops, blocking I/O, mismatch between schema/client/server, strange retries, race/TOCTOU, cleanup, dependency changes, rollback. For critical code, seek independent human or appropriately isolated review; automated review is not a replacement for required human approval.

## Release is a separately authorized boundary

Local code and staging smoke tests do not confer permission to alter production. Before deploy: check required approvals and test outputs, migrations, secrets/config presence, rollout and recovery, metrics baseline, incident contact and communications. Once authorized, observe the change and link actual evidence. On regression, stop or roll back using a prepared and **authorized** path; do not improvise destructive SQL.

## Final reporting

Report precise changed files, observed tests (pass/fail/skipped), side effects, compatibility, known gaps, security risks, release status, roll back command if verified, and next action. If checks are unknown or failing, say **NOT VERIFIED** or **NOT RELEASE READY** and explain why.
