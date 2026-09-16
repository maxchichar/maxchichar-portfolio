# PHASE 3 — FINAL REAL R2 + NEON VERIFICATION

You now have access to the actual `.env.local` containing the real environment
variables. Do NOT assume that credentials are valid merely because the variables
exist. Independently verify them.

## Objective

Close Phase 3 verification honestly.

The implementation is already code-complete. Do NOT redesign or rewrite the
media architecture unless an actual defect is discovered.

The remaining acceptance gap is:

1. Real Neon connectivity
2. Real R2 connectivity
3. Real R2 upload round-trip
4. Real media confirmation
5. PENDING → READY transition
6. Invalid upload → REJECTED transition
7. Cover image attached to a project
8. Cover image survives publish
9. Cover image survives fork
10. Cover image survives rollback
11. No authorization or ownership regression
12. No secrets committed
13. Full regression suite remains green

---

# 1. FIRST — INSPECT THE ACTUAL REPOSITORY

Before modifying anything:

- Inspect the current repository.
- Read `docs/SPECIFICATION.md`.
- Inspect the existing media implementation.
- Inspect:
  - `src/app/api/media/upload-request/*`
  - `src/app/api/media/[id]/confirm/*`
  - project actions
  - project services
  - media repositories
  - validation
  - relevant database schema
  - verification scripts
- Confirm the actual route paths from the filesystem.
- Do not trust route names from previous transcripts.

The actual implementation currently uses:

`/api/media/upload-request`

and

`/api/media/[id]/confirm`

Do not replace these with `/api/admin/media/...` unless the repository itself
proves they have changed.

---

# 2. VERIFY ENVIRONMENT VARIABLES SAFELY

Read `.env.local`, but NEVER print secret values.

Verify only whether each required variable exists and whether it is non-empty.

Required:

```text
DATABASE_URL
AUTH_SECRET
ADMIN_EMAIL
ADMIN_PASSWORD
VERIFY_ADMIN_EMAIL
VERIFY_ADMIN_PASSWORD
STORAGE_ENDPOINT
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
STORAGE_BUCKET
```

Use length/presence checks only.

For example:

```bash
for v in \
  DATABASE_URL \
  AUTH_SECRET \
  ADMIN_EMAIL \
  ADMIN_PASSWORD \
  VERIFY_ADMIN_EMAIL \
  VERIFY_ADMIN_PASSWORD \
  STORAGE_ENDPOINT \
  STORAGE_ACCESS_KEY \
  STORAGE_SECRET_KEY \
  STORAGE_BUCKET
do
  if [ -n "${!v:-}" ]; then
    echo "$v=<set>"
  else
    echo "$v=<missing>"
  fi
done
```

Never output:

- DATABASE_URL
- AUTH_SECRET
- ADMIN_PASSWORD
- VERIFY_ADMIN_PASSWORD
- STORAGE_ACCESS_KEY
- STORAGE_SECRET_KEY
- presigned URLs containing credentials/signatures

If credentials are missing, STOP the corresponding verification and report
`BLOCKED`. Do not manufacture a PASS.

---

# 3. VERIFY NEON FIRST

Run the existing Neon verification:

```bash
npm run verify:neon:db
```

Then:

```bash
npm run verify:neon:auth
```

If either fails:

- capture the actual error;
- determine whether it is:

  - invalid credentials,
  - DNS/network failure,
  - TLS failure,
  - authorization failure,
  - application/database failure;

- do NOT immediately change application code.

The previous environment produced:

```text
403
host_not_allowed
```

against the Neon host.

Determine whether that limitation still exists in the current environment.

If Neon succeeds, report that it succeeded with real Neon.

---

# 4. VERIFY CLOUDFLARE R2 CONFIGURATION

Determine the configured R2 endpoint and bucket without exposing credentials.

Expected bucket:

```text
maxchichar-porfolio-media
```

Verify:

- endpoint exists;
- access key exists;
- secret exists;
- bucket exists;
- credentials can authenticate;
- the configured account can perform the required object operations.

Do not dump credentials.

If the R2 SDK provides a safe connectivity/list/head operation, use it.

The goal is to prove this is REAL R2 connectivity, not merely local presigned URL
generation.

---

# 5. TEST REAL R2 ROUND-TRIP

Use a harmless uniquely named test object.

Example conceptual key:

```text
verification/phase3/<random-id>.png
```

Do not use a production project asset.

The test must perform an actual:

```text
application
   ↓
upload-request
   ↓
presigned URL
   ↓
HTTP PUT
   ↓
Cloudflare R2
   ↓
confirm
   ↓
database READY
```

Use a genuine tiny image whose magic bytes correspond to the declared MIME type.

For example, use a known-valid minimal PNG.

DO NOT fake the upload by directly inserting a READY row into the database.

That would not satisfy the acceptance criterion.

---

# 6. VERIFY UPLOAD-REQUEST

Test unauthenticated access first.

Expected:

```text
401
```

Then authenticated access using the verification/admin account.

Expected:

```text
200
```

Verify the response contains a presigned upload URL.

Do not print the URL.

Instead report something like:

```text
PASS upload-request returned 200 and a presigned URL was generated
```

---

# 7. PERFORM THE REAL R2 PUT

Take the returned presigned URL internally.

Perform the actual HTTP PUT using the valid test image.

Expected:

```text
2xx
```

This is the critical test.

A locally generated presigned URL is NOT enough.

The object must actually reach Cloudflare R2.

Report:

```text
PASS real object uploaded to Cloudflare R2
```

only if the actual PUT succeeds.

---

# 8. VERIFY CONFIRM

Call:

```text
/api/media/[id]/confirm
```

against the media record created by upload-request.

The server must:

1. authenticate the request;
2. verify ownership;
3. retrieve the object;
4. inspect actual bytes;
5. determine the real image type;
6. validate it against the allow-list;
7. determine dimensions;
8. transition:

```text
PENDING → READY
```

Verify the database directly afterward.

Expected:

```text
status = READY
```

Do not infer this from an HTTP 200 alone.

---

# 9. TEST INVALID UPLOAD

Create another isolated test media record.

Attempt an invalid object, such as bytes that do not match the declared
image MIME type.

Confirm that the server does NOT trust the client-declared MIME type.

Expected:

```text
PENDING → REJECTED
```

Verify directly in the database.

Expected:

```text
status = REJECTED
```

---

# 10. TEST COVER IMAGE THROUGH COMPLETE LIFECYCLE

Now use a genuinely `READY` media object from the real R2 test.

Create a project with:

```text
coverMediaId = READY_MEDIA_ID
```

Then verify:

### Create

Project has the correct cover media.

### Publish

Publish the project.

Verify the published version references the correct cover.

### Edit

Create a new draft/version.

Verify the cover is carried forward correctly.

### Fork

Edit the project after publication.

Verify the new draft does not mutate the immutable published version.

### Rollback

Rollback to the selected historical version.

Verify:

- a new restore-forward version is created;
- old versions remain immutable;
- the cover image is restored correctly;
- the correct `coverMediaId` is attached.

### Clear

Verify that explicitly clearing the cover works.

---

# 11. OWNERSHIP / ID-TAMPERING TEST

Do not skip this.

Use:

```text
Project A
Project B
Media belonging to Project B
```

Attempt to attach/delete/manipulate Project B's media while operating on Project A.

Expected:

```text
REJECTED
```

The database must remain unchanged.

Repeat for evidence where applicable.

---

# 12. CLEAN UP R2 TEST OBJECTS

Delete only the temporary verification objects created by this run.

Do NOT delete:

- production media;
- existing project media;
- existing evidence;
- existing user data.

Verify the test object no longer exists.

Then reset the verification account lockout state.

---

# 13. RUN COMPLETE REGRESSION

Run:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run verify:neon:db
npm run verify:neon:auth
```

Also run the existing Phase 3 lifecycle/media tests.

Every failure must be investigated.

Do not change tests merely to make them pass.

---

# 14. SECURITY AUDIT

Search the repository for accidental secrets.

Check for:

```text
.env.local
.bak
backup
DATABASE_URL=
AUTH_SECRET=
STORAGE_SECRET_KEY=
STORAGE_ACCESS_KEY=
presigned URLs
AWS credentials
Cloudflare credentials
```

It is acceptable for `.env.example` to contain placeholders.

It is NOT acceptable for actual credentials to appear in tracked files.

Check:

```bash
git status --short
git diff
git diff --cached
git ls-files
```

Confirm `.env.local` is ignored.

Never include actual secrets in the final report.

---

# 15. DO NOT MODIFY ARCHITECTURE WITHOUT A REAL DEFECT

If all tests pass:

DO NOT:

- rewrite the media pipeline;
- replace R2;
- change the database schema;
- redesign authentication;
- change routes;
- refactor unrelated code;
- add unnecessary dependencies.

Phase 3 should be closed based on evidence.

If an actual defect is discovered, fix the smallest correct thing, then rerun
the affected tests and the full regression suite.

---

# 16. FINAL ACCEPTANCE DECISION

Use exactly one of these:

```text
PHASE 3 — COMPLETE
```

only if all critical acceptance criteria are genuinely verified.

OR:

```text
PHASE 3 — CODE COMPLETE / VERIFICATION PARTIAL
```

if infrastructure/browser/network prevents complete verification.

OR:

```text
PHASE 3 — BLOCKED
```

if a required prerequisite is unavailable.

Do NOT call Phase 3 complete merely because the code looks correct.

---

# 17. FINAL REPORT FORMAT

Return:

## Phase 3 Status

```text
COMPLETE / CODE COMPLETE / VERIFICATION PARTIAL / BLOCKED
```

## Verification Matrix

| Area                      | Result | Evidence |
| ------------------------- | ------ | -------- |
| Typecheck                 |        |          |
| Lint                      |        |          |
| Format                    |        |          |
| Build                     |        |          |
| Neon connectivity         |        |          |
| Neon auth                 |        |          |
| R2 credentials            |        |          |
| R2 connectivity           |        |          |
| Real R2 PUT               |        |          |
| Real object retrieval     |        |          |
| PENDING → READY           |        |          |
| Invalid upload → REJECTED |        |          |
| Cover attachment          |        |          |
| Publish with cover        |        |          |
| Fork with cover           |        |          |
| Rollback with cover       |        |          |
| Clear cover               |        |          |
| Evidence                  |        |          |
| Tags                      |        |          |
| Authorization             |        |          |
| ID tampering              |        |          |
| Cleanup                   |        |          |
| Security audit            |        |          |
| Browser E2E               |        |          |

For every PASS, provide concrete evidence.

For every BLOCKED item, explain exactly why.

---

# 18. GIT DISCIPLINE

Before committing:

```bash
git status
git diff --stat
git diff
```

Only commit actual Phase 3 fixes/verification-support changes.

Do not commit:

```text
.env.local
credentials
temporary test files
presigned URLs
test artifacts
database dumps
backup files
```

If there are no code changes, do not create a meaningless commit.

---

# 19. MOST IMPORTANT RULE

Do not trust previous transcripts.

Do not trust claims such as:

> "R2 is configured."

> "Neon passed."

> "The upload worked."

> "Phase 3 is complete."

Verify everything against the actual repository and actual infrastructure available
in this execution.

The objective is not to produce a PASS report.

The objective is to establish whether Phase 3 actually passes.

If it passes, we move to Phase 4.

If it doesn't, identify the exact remaining blocker and fix it.
