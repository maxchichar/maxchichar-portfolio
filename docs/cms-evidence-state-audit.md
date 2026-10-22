# CMS evidence and editor state audit

Date: 2026-10-22

## Cause and fix

Research and Projects evidence actions redirected to the editor after adding,
removing, or rejecting evidence. Evidence lives in its own form and table; the
redirect could replace an open draft with the last saved version. No evidence
mutation needs to serialize or save the draft.

Evidence actions now return validation results and revalidate their current page
without redirecting. The shared EvidenceForm submits without native navigation
or React form resets, catches request failures, and prevents duplicate requests.
Research's concurrently introduced controlled evidence form also retains its
values and consumes returned field errors. Draft editors remain mounted across
page revalidation, with each section retaining its independent local editor state.

Settings had a related failure path: React action submission can reset its
uncontrolled text inputs even when validation fails. All ten settings text fields
now use local controlled state, which also survives independent media saves.

## Audit coverage

| Editor / shared component  | Findings                                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Research                   | Separate evidence and draft forms; removed evidence redirects for success, validation failure, and removal. Evidence persistence does not update sections. |
| Projects                   | Same evidence issue; same fix. Media selections remain in component state on failed evidence submissions.                                                  |
| Articles                   | Single rich-text draft form; no evidence subform. No shared editor instance, autosave, or effect that overwrites content on refreshed props found.         |
| Home / About / Now         | One explicit draft save per page with all page fields; no independent evidence mutation or autosave closure.                                               |
| Settings                   | Independent media saves plus a text form; fixed text reset after action failure. Media components keep selection state on refresh.                         |
| Testimonials               | Controlled/repopulated validation state already addresses failed submission resets; no evidence operation.                                                 |
| RichTextEditor             | Each instance owns its editor, JSON value and refs. No synchronization effect resetting content from refreshed initial props. Section keys are stable.     |
| ImageField / DocumentField | Local selections, explicit commit operations; no editor form reset or whole-draft save triggered by evidence.                                              |
| Persistence                | Evidence services mutate evidence rows only; scoped removal checks ownership. Draft services save explicitly submitted section content.                    |

No new autosave was added. Unsaved draft text remains unsaved until Save draft.
Normal browser reloads/navigation are outside this fix. Publish/rollback/archive
retain their explicit lifecycle behavior and existing guards.

## Regression coverage and verification

- `scripts/test-evidence-editor.ts`: executes actual Research/Project action code
  with framework and database boundaries mocked; verifies no navigation, inline
  validation, auth checks, isolated evidence writes, duplicate prevention, failure
  recovery, and preservation of all ten Settings text fields across refreshes.
- `e2e/evidence-editor.spec.ts` and its fixture: real React/Tiptap components;
  enters two independent sections, adds/rejects/removes evidence, and checks draft
  form serialization still contains both edited sections and title. Evidence
  responses are simulated; this is not a database-backed authenticated test.
- Typecheck and lint passed. Full unit suite passed: 197 tests, zero failures.
- Final production build passed with the Settings fix included.
- Browser regression could not execute: Playwright Chromium was missing. Its
  installation stalled at 0% and was cancelled. No browser pass is claimed.

Concurrent edits to evidence validation, Research's evidence-specific form and
public evidence display were preserved; they are separate from this state's fix.

## Files changed for this fix

- `src/app/admin/(protected)/research/actions.ts`
- `src/app/admin/(protected)/research/[id]/evidence-panel.tsx`
- `src/app/admin/(protected)/projects/actions.ts`
- `src/app/admin/(protected)/projects/[id]/evidence-panel.tsx`
- `src/components/admin/editor/evidence-form.tsx`
- `src/app/admin/(protected)/settings/settings-form.tsx`
- `scripts/test-evidence-editor.ts`
- `e2e/evidence-editor.spec.ts`
- `e2e/fixtures/evidence-editor.tsx`
- `docs/cms-evidence-state-audit.md`
