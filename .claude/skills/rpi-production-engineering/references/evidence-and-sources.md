# Evidence discipline and source registry

## Source reliability hierarchy

1. **Direct observations:** source code, actual command output, integration tests, database schema, versioned configuration, first-party APIs.
2. **Primary authorities:** official vendor/framework docs, standards publishers, package changelog/security advisories.
3. **Secondary sources:** measured case studies and reputable peer reviewed/reproducible explanations.
4. **Unverified content:** forum assertions, AI summaries, search snippets, stale marketing pages, screenshots without provenance.

For a consequential claim: link the version, source URL, publication/retrieval date and what it proves. Explain source disagreement. Never infer current behavior from stale documentation. Do not cite a source as proof of a claim it doesn't support.

## Referenced standards and documentation (verified 2026-10-17)

- Agent Skills specification: https://agentskills.io/specification — `SKILL.md`, frontmatter, progressive disclosure.
- OpenAI Codex skills overview: https://developers.openai.com/api/docs/guides/tools-skills — reusable portable skills, hosted or local execution.
- Anthropic skill authoring: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices — concise metadata and skill body, test real examples.
- NIST SP 800-218 SSDF v1.1 (final): https://csrc.nist.gov/pubs/sp/800/218/final — secure software development practices. NIST SP 800-218 Rev 1 v1.2 remains an initial public draft as of this registry snapshot: https://csrc.nist.gov/pubs/sp/800/218/r1/ipd ; do not treat draft as final.
- NIST SP 800-218A (final): https://csrc.nist.gov/pubs/sp/800/218/a/final — AI model-specific SSDF community profile.
- OWASP ASVS 5.0.0: https://owasp.org/projects/asvs — verification checklist for web application security.
- OWASP GenAI Security Project: https://owasp.org/projects/top-10-for-large-language-model-applications — prompt injection, unsafe outputs and agent risk.
- SLSA v1.2: https://slsa.dev/spec/v1.2/ — software supply-chain source/build tracks and provenance. Do not assert any SLSA level without audited requirement evidence.
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/ — accessibility criteria, common baseline AA targets.
- OpenTelemetry observability primer: https://opentelemetry.io/docs/concepts/observability-primer/ — logs, metrics and traces.

The skill borrows **principles**, not a claim to implement every clause of these frameworks. For legal/compliance requirements, consult actual current regulator or qualified counsel and scope by jurisdiction/data processing.

## Citation and evidence in project artifacts

Prefer a table with: claim, type (`observed` / `documented` / `inferred` / `assumed`), source link/path, version/date, confidence, and decision relevance. Example:

| Claim | Type | Support | Consequence |
| --- | --- | --- | --- |
| Requests can be duplicated after timeout | observed | integration test + command log | idempotency required |
| Hosting provider supports atomic KV mutation | unverified | none | must verify before relying on KV |

Never store credentials, production user secrets, private customer dumps or unredacted health/financial records in an evidence folder. Hash identifiers or use anonymized test data where supported. Avoid copying full third-party documents into the repository; link and summarize appropriately.
