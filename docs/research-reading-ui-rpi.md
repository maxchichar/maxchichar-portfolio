# Research reading UI — Research, Plan, Implement

## Research

- `ResearchDetailView` explicitly sent `tone="lead"` for `research_question`.
- `NarrativeSection` mapped that to `.rich-text-lead`: 22–30px and 1.4 line height versus the normal 19px and 1.7. This is presentation, not stored heading size or a CMS validation problem.
- Sources were rendered with the same narrative treatment as every other section. Their canonical content is Tiptap JSON, potentially paragraphs, ordered/bulleted lists, nested annotations, headings, and authored links.
- Published and preview research share the view. Project case studies share `NarrativeSection`, so any sources styling must be opt-in.
- Existing changes from the evidence task and other local work remain in place.

## Plan

1. Use the normal narrative tone for Research Question, keeping section headings consistent.
2. Give only Sources a bibliography treatment: compact type, divided reference rows, quiet ordered markers, wrapping URLs, and explicit link focus styling.
3. Keep the stored document intact, including numbering starts, rich marks, link safety, and nested lists. Do not infer titles, authors, dates, or citation counts.
4. Test the actual renderer and computed CSS at desktop/mobile sizes, in light/dark themes; run lint, typecheck, tests and production build. Do not deploy.

## Implementation

- `ResearchDetailView` opts Sources into a new `references` tone; Research Question now uses the default tone.
- `NarrativeSection` renders the original source document through the existing safe `RichText` renderer with a scoped class.
- `.rich-text-sources` changes presentation only. Top-level paragraphs/list entries receive separators; nested content keeps its hierarchy. Ordered list starts and authored citation labels remain unchanged.
- No schema changes, migrations, database writes, or deployment.

## Verification

- `npm test`: 198 passed.
- Six Playwright checks passed across desktop/mobile and light/dark themes, with the portfolio fonts and mobile viewport enabled. Checked equal question/background font sizes and line heights, ordered-list start preservation, nested annotations, link safety/focus, long URL overflow, paragraph citations, and omission of empty Sources sections.
- Inspected desktop/light and mobile/dark Sources screenshots using synthetic references.
- Lint, typecheck, production build, and diff whitespace checks passed.
- The first combined-process regression invocation encountered shared environment state in an existing storage/CSP test; the standard process-isolated `npm test` command passed.
- No live data was changed; the UI has not been deployed.
