# Content API (Phase 11.2)

Lets other tools, such as an AI writing agent, read articles and create or
edit drafts. Nothing sent through the API goes live: a person reviews and
publishes every draft in the admin. Publishing is impossible by design. The
database refuses the `content:publish` scope on any key
(`api_keys_no_publish_scope`), and the publish service refuses any non-human
caller.

## Keys

Create keys in the admin under **Site → API keys**. A key is shown once.
Only its SHA-256 hash is stored, so a lost key can't be recovered: revoke it
and create a new one. Revoking takes effect immediately.

| Permission      | Allows                                               |
| --------------- | ---------------------------------------------------- |
| `content:read`  | `GET` endpoints                                      |
| `content:draft` | Creating articles and editing drafts (includes read) |

Send the key on every request:

```
Authorization: Bearer cmx_…
```

## Base URL

`https://admin.chibuezemaxwell.com/api/v1`

The public domain (`chibuezemaxwell.com`) does not serve the API.

## Endpoints

### `GET /articles`

Every article: `id`, `slug`, `status` (`ACTIVE`/`ARCHIVED`), `title`,
`hasDraft`, `isPublished`, `publishedAt`, `url` (the live page, or null).

### `GET /articles/{id}`

One article with its `draft` and `published` versions. Each version has
`title`, `excerpt`, `category`, `readingTime`, the body as `markdown` and as
the editor's Tiptap JSON (`content`), and `provenance` (`createdByType`,
`generationMode`, `source`).

### `POST /articles` (`content:draft`)

Creates an article as a draft.

```json
{
  "slug": "on-systems",
  "title": "On Systems",
  "excerpt": "One or two sentences, up to 300 characters.",
  "category": "Essay",
  "tags": ["Systems", "Engineering"],
  "body": "## A heading\n\nMarkdown text…"
}
```

Send the body as Markdown (`body`) or Tiptap JSON (`content`), not both.
`slug`, `title` and `excerpt` are required. Responds `201` with the article.

### `PATCH /articles/{id}/draft` (`content:draft`)

Edits the article's draft, starting one from the live version if there is
none. Only the fields you send change: `title`, `excerpt`, `category`,
`tags`, `body` or `content`. The live page doesn't change until a person
publishes the draft.

## Errors

```json
{
  "error": {
    "code": "invalid_request",
    "message": "slug: lowercase letters, numbers and hyphens only"
  }
}
```

| Status | Code                                             |
| ------ | ------------------------------------------------ |
| 400    | `invalid_json`                                   |
| 401    | `unauthorized` (missing, unknown or revoked key) |
| 403    | `forbidden` (key lacks the permission)           |
| 404    | `not_found`                                      |
| 409    | `conflict` (e.g. slug taken), `archived`         |
| 413    | `too_large` (bodies are capped at 512 KB)        |
| 415    | `unsupported_media_type` (send JSON)             |
| 422    | `invalid_request`, `invalid_content`             |
| 429    | `rate_limited` (60 requests a minute per key)    |

## Provenance and audit

An article created through the API is saved with `created_by_type = AI`,
`generation_mode = AI_GENERATED` and `source = content-api:<key name>`. A
human draft edited through the API becomes `AI_ASSISTED`. The admin editor
shows a notice on such drafts. Key creation and revocation, and every API
write, are recorded in the audit log.

## Example

```bash
curl -s https://admin.chibuezemaxwell.com/api/v1/articles \
  -H "Authorization: Bearer $CONTENT_API_KEY"
```
