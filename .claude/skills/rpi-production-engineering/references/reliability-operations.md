# Reliability, operations and delivery playbook

## Design failures deliberately

Define SLOs/SLIs based on user journeys (success/error rates, p95/p99 latency where supported, freshness, processing correctness) and expected load. Do not invent production thresholds; use product needs and actual baseline. Where an SLO matters, say its owner, measurement window, alert/action and acceptable degradation.

Use bounded timeouts, cancellation, bulkheads, connection pools, retry budgets, exponential backoff with jitter, circuit-breaker when appropriate, queue depth controls, graceful shutdown and bounded memory/CPU. Retries only on safe/transient errors with idempotency. Distinguish safe retry from duplicate financial operation.

## Observability

- **Metrics:** RED (rate, errors, duration) or USE (utilization, saturation, errors) by component, plus business outcome metrics.
- **Logs:** structured event, correlation/request ID, safe metadata, error class and enough state to debug—never secrets or sensitive payload.
- **Traces:** important request spans and cross-service propagation where multi-hop diagnosis demands it.
- **Alerts:** action-oriented, low noise, useful runbook link; alert on symptoms impacting users rather than every internal warning.
- **Dashboards:** baseline before rollout, post-release comparison and version tagging. Keep telemetry overhead and data retention controlled.

OpenTelemetry documents metrics, logs and traces as complementary signals (see sources). Do not create a metrics stack solely for a small static-site patch.

## Database releases

Use expand/contract for backwards-compatible schema evolution: new columns/indexes without breaking old code, backfill in bounded batches, dual-read/write only when needed, shift consumers, observe, then remove old schema in a later release. Large schema changes need lock and throughput assessment, backups, recovery plan and DBA/operator review where available.

## CI/CD and supply chain

CI should run on required changes: static checks, tests, builds and appropriate audits. Use restricted short-lived credentials and protected branches as allowed. Artifacts should be traceable to source and immutable when possible. SBOM/provenance and SLSA adoption scale with threat model; simply writing a provenance file is not a certification.

## Deployment choices

- Simple patch: normal pipeline plus smoke check and quick revert.
- Standard: health check, release note, migration safety and rollback, targeted smoke, owner.
- Critical: approved change window where appropriate, independent review, canary/staged rollout, monitor defined stop signals, rehearsed recovery, incident contact and audit trail.

Never initiate production mutations solely because the workflow has reached a release step; permissions and human review remain explicit.

## Runbook essentials

What it does, owners, external dependencies, SLOs, how to inspect healthy/unhealthy, dashboards/log queries (without sensitive data), how to disable the feature, rollback and restore procedure, escalation route, data repair procedure (if any), known false alarms. A runbook is useful only if commands are verified in that environment and are safe for the intended operator.

## Incident mode

On active harm: stabilize impact first; freeze nonessential changes; capture timestamps, versions, error rates and blast radius; use approved kill switch/rollback; communicate uncertainty; find cause only after mitigation. Record corrective actions for detection, prevention and recovery, without inventing root cause early.
