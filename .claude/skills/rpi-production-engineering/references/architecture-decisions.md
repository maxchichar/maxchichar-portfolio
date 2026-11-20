# Architecture decision quality

## ADR threshold

Write an ADR when the choice affects data ownership, storage technology, public contracts, tenant isolation, deployment topology, significant recurring cost, operational burden or hard-to-reverse dependencies. Keep simple library changes inline.

## Decision record anatomy

1. **Context:** observed problem, invariant, evidence, constraints and expected lifespan.
2. **Options:** minimum of meaningful options including least-change/no-change alternative.
3. **Criteria:** correctness, usability, security/privacy, latency/load, availability, total cost, team operational skill, evolution/reversal cost.
4. **Decision:** selected option, why and status (`proposed`, `accepted`, `superseded`).
5. **Consequences:** benefits, tradeoffs, new failure modes, maintenance responsibilities, migration/rollback.
6. **Revisit trigger:** measurable signal that invalidates assumptions; owner/date.

## Architecture tests

- Can requirements be met using existing components and a single code path?
- Is there a clear source of truth, or can competing stores diverge?
- Are failure semantics defined for retries, duplicated events, timeouts and partial commits?
- Does a change to one interface require simultaneous deploys? Can consumer/provider skew be tolerated?
- Are security controls enforced at the real trust boundary, rather than in the UI?
- Will operational burden exceed the value of the abstraction?
- Could an experienced maintainer explain the system without redrawing a fantasy diagram?

## Example: synchronous vs queue

Choose synchronous path if work fits bounded request deadlines and reliability obligations; use a worker/queue only if durable async retry, burst control or isolation has demonstrated value. Queue introduces ordering, dedupe, poison messages, dead-letter handling, operating cost, eventual consistency and on-call obligations. A queue is not inherently scale or reliability.
