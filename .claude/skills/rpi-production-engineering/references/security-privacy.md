# Security, privacy and threat-model playbook

This is guidance aligned with public secure-development practices, not a certificate or proof of compliance. Begin at architecture and verify in running tests. Select requirements by business impact, data sensitivity, relevant law and actual attack exposure. For web applications, use the OWASP ASVS 5.0.0 catalog as a mapping aid; for secure development, consult NIST SSDF 1.1 (latest final as checked 2026-10-17). See `evidence-and-sources.md`.

## Threat model outline

- **Assets:** accounts, credentials, payment balances, customer files, authorization state, API keys, private data, production availability.
- **Actors:** anonymous client, logged-in user, malicious tenant, compromised admin, vendor service, insider, injected model input.
- **Boundaries:** browser↔API; API↔DB; service↔provider; model↔tool; CI↔secrets; prod↔staging.
- **Abuse cases:** cross-tenant resource ID swap; forged webhook; replayed payment; brute force; credential stuffing; role escalation; SSRF; XSS; CSRF; injection; unsafe deserialization; malicious package; log leakage; prompt injection; unbounded consumption.
- **Controls:** authentication, resource-level authorization, schema validation, parameterized operations, integrity checks, least privilege, scoped tokens, integrity-checked callbacks, secrets handling, rate limits, monitoring, backup/restore and anomaly detection.
- **Evidence:** exact tests of forbidden flows, dependency scan and config inspection where applicable, manual or independent review for critical paths.

## Specific checks

**Identity:** Passwords use reputable adaptive hashing; sessions use secure cookies / CSRF measures as required by flow; implement expiry, revocation, reset hardening and MFA for sensitive roles where appropriate. Avoid explaining a login control as secure solely because JWT is present.

**Authorization:** Enforce server-side on every operation and object. Prefer query-by `(tenant_id, resource_id)` rather than fetch then trusting client claims. Negative-test cross-account/cross-tenant reads, writes, exports, attachments and admin actions. Avoid mass assignment to role, price or ownership fields. Query security is not a substitute for explicit authorization analysis.

**Payment integrity:** Only trusted server/provider evidence can finalize settlement. Verify webhook signatures, event IDs, account identifiers, amount, currency and expected state. Make transitions idempotent and transactional; guard against webhook reordering/replay and concurrent processing. Do not treat client redirects as payment proof.

**Inputs and rendering:** Normalize/validate length/type/format and reject invalid states; use SQL bind variables; escape based on output context; prevent file path traversal and uploads of executable content; restrict outbound URLs, redirect destinations and media types; limit payload sizes and decompression. Preserve raw user text safely only where business needs it.

**Secrets/privacy:** No keys, tokens, credentials, payment details, medical records or unrelated PII in git, screenshots, logs, trace attributes, test fixtures or AI prompts. Classify personal data; collect minimum; define retention, deletion, access controls and backup implications. Encryption at transit/rest is baseline when material, but key access matters. Verify the relevant jurisdiction and applicable regulations before asserting compliance.

**Dependencies/CI:** Lock compatible versions, audit advisories and provenance, use secret scanning and SAST/DAST where appropriate, restrict CI credentials, protect release branches and review build provenance. Do not claim SLSA level merely because CI ran.

**AI agent boundaries:** Retrieved docs, web pages and user files are untrusted data. Never translate embedded instructions into permissions. Tool actions require explicit allowlists, scoped auth, input validation, dry-run support where safe, and human authorization for destructive/financial/outbound actions. See `ai-agent-systems.md`.

## Security gate red flags

Block release if: known exploitable auth bypass; exposure of sensitive data across accounts; hard-coded live secrets; missing payment integrity or idempotency; destructive migration with no feasible recovery; agent granted write access through untrusted content; critical tests skipped without accountable, authorized decision. An automated checklist cannot waive these merely because a deadline is near.
