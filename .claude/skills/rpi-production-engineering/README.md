# RPI Production Engineering — MAXCHICHAR

A portable Agent Skills workflow for **Research → Plan → Implement**, with progressive-depth playbooks, reusable records, a standard-library Python evidence-gate validator, and adversarial evaluation scenarios. Designed for existing applications and greenfield systems. It is a *workflow and verification aid*, not a certified security auditor, autonomous production operator, or a guarantee of defect-free code.

## What you get

- `SKILL.md`: trigger, instructions, phases, escalation, safety, delivery contract.
- `references/`: focused engineering playbooks loaded on demand, plus machine-readable gate definitions.
- `assets/templates/`: research/plan/implementation/release, ADR, runbook, threat model, traceability templates.
- `scripts/rpi.py`: initialize a scoped RPI record and check gate evidence with no Python dependencies.
- `scripts/validate_skill.py`: deterministic bundle integrity checks.
- `scripts/test_rpi.py`: CLI unit tests including bypass attempts and missing evidence.
- `examples/`: realistic task prompts, expected skills behavior, and testable evaluation cases.

## Install directly from GitHub

**Agent Skills CLI (recommended):**

```bash
npx skills add maxchichar/rpi-production-engineering
```

For a global installation:

```bash
npx skills add maxchichar/rpi-production-engineering -g
```

The CLI discovers the repository's `SKILL.md` and prompts for supported agents and installation scope. Check the CLI's current options with `npx skills --help`. Review the repository before installing agent instructions.

**Manual Git installation (from your project's root):**

Codex / Agent Skills convention:

```bash
mkdir -p .agents/skills
git clone https://github.com/maxchichar/rpi-production-engineering.git .agents/skills/rpi-production-engineering
```

Claude Code:

```bash
mkdir -p .claude/skills
git clone https://github.com/maxchichar/rpi-production-engineering.git .claude/skills/rpi-production-engineering
```

Update a manual Codex installation with:

```bash
git -C .agents/skills/rpi-production-engineering pull --ff-only
```

Manual clones are separate Git repositories; avoid accidentally committing nested repositories into the host project. The host agent must support the selected skill directory and may require restarting or reloading skills.

## Install in a repository

**Codex / agents following the Agent Skills convention:**

```bash
mkdir -p .agents/skills
cp -R rpi-production-engineering .agents/skills/rpi-production-engineering
```

**Claude Code:**

```bash
mkdir -p .claude/skills
cp -R rpi-production-engineering .claude/skills/rpi-production-engineering
```

Use only one copied version per agent/workspace to avoid conflicting policy. Some hosts accept importing the ZIP as a skill; use the host's documented process. The installation location is host-dependent; copying the files does not automatically activate a particular model.

Try: **"Use the rpi-production-engineering skill. Research the existing billing export flow, plan the smallest safe change, then implement and test. Do not deploy."**

## Quickstart for a tracked change

```bash
python3 .agents/skills/rpi-production-engineering/scripts/rpi.py init \
  --project . --task "Fix invoice idempotency" --tier critical
# Modify generated evidence.json with factual checks and linked proof.
python3 .agents/skills/rpi-production-engineering/scripts/rpi.py status \
  --record docs/rpi/fix-invoice-idempotency/evidence.json
python3 .agents/skills/rpi-production-engineering/scripts/rpi.py validate \
  --record docs/rpi/fix-invoice-idempotency/evidence.json --phase research
```

The validator exits nonzero until all required checks for the gate are supported. It confirms the **existence and shape** of evidence, not the correctness of its assertions. It does not run project tests. Provide test logs and source documentation in the generated task folder and reference the paths in the JSON record. Gate ordering ensures a later gate does not pass while prior ones are open.

## Evidence entry format

An example `checks` item in `evidence.json`:

```json
"R-01": {
  "status": "pass",
  "evidence": [{"path": "docs/rpi/fix-invoice-idempotency/research.md", "note": "repro steps and scope"}],
  "note": "Observed the same request accepted twice in local integration test",
  "waiver": null
}
```

Use relative paths inside the repository. A waiver is represented as `status: "waived"`, `waiver: {"reason": "...", "approved_by": "...", "expires": "YYYY-MM-DD"}`; only designated waivable checks are eligible. An approval requirement cannot be satisfied by claiming that the agent approved itself. For critical work, the approval must be documented and attributable to a genuinely authorized person; for an actual external action follow the tool's approval process too.

## Risk tier selection

- `patch`: isolated reversible, low-blast-radius changes.
- `standard`: normal feature, service, data, or UI work.
- `critical`: authn/authz, payments, money, PII, production migrations, cross-tenant risk, regulated/safety-sensitive actions, destructive changes, agent tools with write authority or significant scale.

Escalate risk when new findings demand it. A `patch` tier is not a mechanism for opting out of security checks. The best architecture is often a smaller change, not more infrastructure.

## Run self-tests

```bash
python3 scripts/validate_skill.py .
python3 -m unittest discover -s scripts -p 'test_*.py' -v
```

## References

The playbooks are inspired by the open Agent Skills format, NIST SSDF, OWASP ASVS and GenAI guidance, SLSA, WCAG 2.2 and modern SRE/observability practices. References and edition dates are in `references/evidence-and-sources.md`. These are **engineering guides**, not claims of formal standards compliance.

## Distribution

Version: `1.0.0`. License: Apache-2.0. This bundle is suitable for version control. Review before installing in an environment with credentialed or production-capable tools. Do not commit secret-bearing logs or customer data as evidence.
