# Phase R: Research playbook

## Output requirement

Deliver an evidence-based problem definition and baseline, not an essay that merely repeats the user's request. For persistent work, fill `assets/templates/research.md`.

## 1. Understand the real problem

Use **actor → situation → task → friction → impact → desired outcome**. Ask what users do now, why the current workflow fails, volume/frequency, constraints, accessibility, cost tolerance and measurable improvement. Challenge solution-first requests: can deletion, process change, config, or current functionality solve this more reliably than new software?

State in/out scope and non-goals. Separate functional requirements from latency, availability, security, privacy, cost, operability, UX, compatibility and maintainability. Note the baseline and acceptance signal.

## 2. Explore the existing system

Inspect responsibly, without blindly running scripts:

```bash
git status --short
find . -maxdepth 2 -type f \( -name 'README*' -o -name 'package.json' -o -name 'pyproject.toml' -o -name 'go.mod' -o -name 'Cargo.toml' -o -name 'AGENTS.md' \)
# Then inspect relevant source, current tests, migrations, CI and config.
```

The commands are **examples**, not a requirement to run them. Respect `.gitignore`, avoid listing secret files, avoid recursive huge output. Use project-aware search (rg/find) selectively. Determine canonical dependencies and runtime versions from manifests and lock files. Find the current data flow: entry point → validation → authorization → domain logic → persistence / external system → response → observability.

Where useful, inspect `git log --oneline -n 10 -- <path>`, relevant issues or commit history; recent code may represent deliberate constraints. Preserve user modifications and the working tree. Avoid `git reset --hard`, unconditional package updates or wholesale generated rewrites.

## 3. Reproduce and set a baseline

- Define reproducible steps, expected vs actual, environment and fixture.
- Run a targeted test, test request or minimal harness when safe and tooling is available.
- If it is a performance issue, record realistic workload, percentiles, sample count, environment, hardware and methodology. Avoid baseless "30% faster" claims.
- If service exists in production but cannot be accessed, do **not** describe inferred production behavior as observed.
- Record upstream system behavior and current contract before changing anything.

## 4. Map failures and dependencies

Analyze each boundary: client/server, user/organization, service/database, trusted/untrusted input, model/tool, retries/side effects, browser/API, synchronous/async queues. Identify failure categories: invalid input, missing auth, stolen session, partial response, duplicate request, concurrent writes, eventual consistency, timeout, rate limit, dependency outage, schema skew, stale UI, offline and corrupt files.

Identify change amplification: which systems/users could break if an assumption is wrong? Which data is durable and costly to repair? Who owns the incident?

## 5. Evidence and alternatives

Use primary documentation, exact version and date for API behavior, standards, dependencies and constraints; cite references inline. Source code, lockfiles and actual tests generally outrank old blog posts about the project. Evaluate at least `minimal repair`, `reuse current component`, `small new component`, and `do nothing / defer`, where relevant.

Compare: correctness, security, delivery time, reversibility, cognitive load, cost, operational responsibility and future optionality. Do not select microservices, queues, AI, blockchain, vector stores, or complex auth frameworks because they are fashionable.

## 6. Research exit checklist

- Evidence supports problem and baseline; provenance distinguished.
- Unknowns and assumptions are explicit and prioritized by consequence.
- Relevant existing implementation and tests inspected.
- Attack/data boundaries recognized for sensitive work.
- At least one smaller alternative examined.
- No hidden external action or unauthorized data collection.
- Conclusion is a testable problem statement with decision recommendation.

If this gate fails, deliver findings and list blockers. If user requested only research, do not implement or silently create infrastructure.
