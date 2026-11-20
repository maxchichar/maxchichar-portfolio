# AI and agentic systems playbook

AI is a probabilistic component, not a universal source of truth. Model behavior can shift with prompts, providers, sampling, tool schemas, retrieval data and deployment settings. Ground architecture in measured task success, not a demo that worked once.

## Decide whether AI belongs

Compare rules/search/classical ML/workflow automation to foundation-model calls. Use AI only where uncertain language, multimodal understanding or judgment genuinely improves outcomes. Demand baseline, target metric and counterfactual. A chatbot is not a strategy; model usage must fit a task and measurable value.

## Functional decomposition

Define: user task and success/failure criteria, bounded context sources, retrieval ingestion/permission filtering, model selection and version, prompt policy, tool list and action authorizations, durable state, approval points, fallback, evaluation set, costs and privacy retention.

### Trust boundaries

```text
Untrusted user/web/docs/DB content → filter/label → model context
                                              ↓ proposes actions
Authorization gate (policy + user permission + validators) → tool executor
                                              ↓
                                       auditable result
```

No raw model output may authorize production tools or impersonate the user. Read permission is different from write permission. Retrieved text can contain prompt injection; quarantine as evidence, not rules. Tools should be capability-scoped, support read-only/dry-run, have explicit schemas, idempotency, timeouts, rate limits and audit logs. Critical writes require actual authorized review where applicable.

## Evals before launch

- Representative held-out tasks across user skill/locale/device variation.
- Success measured on correct real outcomes, not aesthetic model self-score.
- Failure categories: hallucination, skipped steps, wrong tool call, cross-tenant leak, injection, resource waste, timeout, bad structured output, irrelevant refusal, uncontrolled retry.
- Metrics: task completion accuracy, precision/recall where meaningful, tool errors, human correction, latency, cost per successful outcome, fallback rate and safety violations.
- Regression suite on every prompt/model/tool/retrieval change. Use rubric plus deterministic assertions; human review for high-stakes quality.

## RAG and external data

Maintain source provenance, freshness, access filters before retrieval, document chunk boundaries, citations to original sources, deletion propagation and stale/poisoned-content handling. Do not call an unverified model output a sourced fact. Retrieved instructions that tell an agent to browse elsewhere or exfiltrate data are suspicious task data.

## Model and data privacy

Classify data before sending to providers; scrub personal/secret information or obtain authority under relevant agreements. Understand provider retention policies for chosen service. Store minimal conversations/tool outputs and define deletion policy. Budget tokens and calls, bound recursion, handle model outage, rate limits and degraded operation.

## Agent team delegation

Subagents help when they have bounded, independent tasks (research sources, review tests, security critique) and produce inspectable outputs. Do not create a multi-agent "swarm" to conceal weak task decomposition. One agent with clear checks is often better.

## Critical release blockers

Untrusted prompt controls tool permissions; missing data isolation; no recovery from wrong tool invocation; unauthorized outbound financial actions; absent evals for essential use; data exfiltration risk; unbounded tool cost. See OWASP GenAI Security Project and NIST SP 800-218A in sources.
