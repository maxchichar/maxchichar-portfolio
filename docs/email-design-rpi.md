# Email design — Research, Plan, Implement

## Research

What the site sends: replies from the admin inbox (`replyEmail`), the visitor
receipt and the new-message alert (`contact-email.ts`), and error alerts
(`errors.ts`). All go out through Resend (`email.ts`).

Problems in the previous templates:

- **Wrong name in the signature.** The receipt signed off with the site name
  setting, which is stored in caps ("CHIBUEZE MAXWELL").
- **Replies looked like newsletters.** A one-to-one reply sat in a gray canvas
  with a dark banner and a card. Personal email from people people trust reads
  like a letter, with the brand in the signature.
- **Off-brand type and color.** Georgia and system sans everywhere. The site
  uses Inter Tight (headings and UI), Newsreader (reading text) and JetBrains
  Mono (labels), with the logo violet `#652bfc`.
- **Two design languages.** Error alerts still used the original layout.
- **No dark mode.** `color-scheme: light` only. Apple Mail and Outlook for Mac
  users on dark mode got a bright white card.
- **Outlook desktop.** It ignores `max-width`, so the 600px column stretched
  to the full window. There were no MSO fallbacks.
- **Fixed padding on phones.** It was 36px on every screen width.
- **Thin content.** The receipt gave the visitor nothing to do next, and the
  signature had no role or links.
- **The logo only worked on dark.** The transparent PNG had paper-colored
  strokes, so it relied on the dark banner behind it.

Constraints in mail clients:

- Gmail (web and apps) drops `prefers-color-scheme` and web fonts, but keeps
  inline styles. Every email must look finished from inline styles alone.
- Apple Mail, iOS Mail and Outlook for Mac load web fonts and honor dark-mode
  media queries.
- Outlook for Windows renders with Word. It needs table layout, a fixed-width
  conditional wrapper, and buttons that are padded links (no VML needed).
- SVG is unreliable in email, so the mark must be a PNG.
- Gmail clips emails over 102 KB. These are about 10 KB.

## Plan

1. One design system (`email-design.ts`) with tokens, content blocks (eyebrow,
   heading, paragraph, prose, quote, details, code, button, link, small,
   signature) and two frames:
   - `letterEmail` for personal replies: white page, no card, brand in the
     signature.
   - `cardEmail` for notices: mark and name on the canvas, content on a
     rounded card, footer links, why the email was sent, and a copyright line.
2. Profile from Settings: the display name comes from the `REPLY_FROM_EMAIL`
   display name, or the site name in title case. The role comes from the site
   description. Links are the LinkedIn, GitHub and X profiles that are set.
3. Brand mark as a dark rounded tile PNG (`public/email/mark.png`, 3x) that
   holds up on light, dark and inverted backgrounds. Serve it through the edge
   worker.
4. Enhancements in `<head>` only: web fonts, dark-mode palette (including
   Outlook.com's `[data-ogsc]`), phone padding, MSO column. Everything
   degrades to the inline design.
5. Content: a receipt with next steps (work, research, writing), an alert with
   the visitor's details and a "Reply from your inbox" button, a reply with a
   full signature and the quoted message, and an error alert in the same
   system.
6. Verify by rendering every email in light, dark, phone and "Gmail" (head
   styles stripped), plus tests for escaping, structure and the profile.

## Implementation

- `src/server/services/email-design.ts`: tokens, blocks, `cardEmail`,
  `letterEmail`.
- `src/server/services/contact-email.ts`: `profileFrom`, `emailProfile`,
  `ownerEmail`, `visitorEmail` and `replyEmail` rebuilt on the system.
  Plain-text parts gained the signature and the next steps.
- `src/server/services/contact.ts`: replies sign with the Settings profile.
- `src/server/services/errors.ts`: error alerts use `cardEmail`.
- `public/email/mark.png`: 144×144 tile (shown at 32 and 44px).
  `cloudflare-edge.mjs` serves `/email/mark.png`. The old `/email-logo.png`
  stays, so emails already sent keep their logo.
- Visitor input is escaped everywhere. The receipt still never echoes the
  visitor's message.

## Verification

- Rendered the receipt, the alert, the reply and the error alert at desktop
  light, desktop dark, phone, and Gmail (no `<style>`/`<link>`) widths and
  checked each one. The first pass caught three problems, all fixed: quoted
  text that was unreadable in dark mode, a square border around the rounded
  card, and a duplicated "Message received" label.
- `scripts/test-email-design.ts`: profile name and links, escaping across all
  templates and frame options, no echo in the receipt, the MSO column, dark
  mode, phone sizes, the preheader, the signature, and replies having no card.
- `npm test`, typecheck, eslint, prettier, `npm run build` and
  `npm run check:edge` pass.
- Not verified in real clients (Outlook for Windows, Gmail apps). Send a test
  reply after deploy.

## Rollout

Deploy the site, then redeploy the edge worker (`npm run deploy:edge`) so
`https://chibuezemaxwell.com/email/mark.png` is served. Until then, the mark
in new emails shows as a broken image.

---

# Pass 2: profile photo, measured accessibility, privacy

Tier: **standard**. These are UI and email changes. Risk promoter: a personal
photo sent to strangers, so exposure was checked. Done with the
`rpi-production-engineering` skill.

## Research

- **Where the photo comes from.** Settings → Profile photo (the `avatar` site
  document) is described as a square photo. It is empty in production, so the
  site falls back to the About portrait. Observed live on 2026-11-20: a
  4000×6000 JPEG of 3,386,079 bytes, full-body with the face in the upper
  third.
- **Mail clients can't crop.** Gmail and Outlook ignore `object-fit`, so a
  portrait in a circle is squashed, and an uncropped portrait at 50px shows a
  tiny face.
- **Size.** Observed live: the site's resizer
  (`https://chibuezemaxwell.com/_next/image?url=…&w=256&q=75`, already allowed
  by the edge worker's `_next/` rule) returns a 6,951-byte JPEG to clients
  that don't accept WebP and a 3,386-byte WebP to those that do. 256 is the
  smallest width `next.config.ts` allows.
- **Privacy defect.** The visitor receipt set `Reply-To` to
  `CONTACT_NOTIFY_EMAIL` or the primary email, a private address the visitor
  would see when replying. `hello@` now receives mail, so it isn't needed.
- **Accessibility was never measured.** Computed WCAG contrast for every
  text/background pair. All light pairs pass. Two dark-mode pairs fail: the
  violet eyebrow at 2.94:1 and the red error eyebrow at 2.85:1. The signature
  separators were 1.27:1.
- **Alternatives considered.**
  1. Use the About portrait with CSS cropping. Rejected: clients don't support
     it, so it renders squashed.
  2. Crop images on the server. Rejected: it needs a new image dependency for
     a single image.
  3. Commit a cropped photo to the repo. Rejected: it bypasses the CMS and
     goes stale when the photo changes.
  4. Chosen: use the Settings profile photo when it is roughly square, through
     the existing resizer; otherwise the brand mark. A square headshot cropped
     from the portrait is handed to the owner to upload.

## Plan: acceptance criteria → evidence

| #   | Criterion                                                                                                                                            | Evidence                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A1  | With a square profile photo, the receipt header and signature and the reply signature show it in a circle next to the name, via the resizer at w=256 | `test-email-design`: "shows the photo…", "uses a square upload…" and renders                            |
| A2  | A portrait, unknown size, foreign host or query-string URL falls back to the brand mark: never squashed, never megabytes                             | "falls back to the brand mark…"                                                                         |
| A3  | Alerts to the owner keep the brand mark in the header                                                                                                | "shows the photo…" (alert header assertion)                                                             |
| A4  | Every text color is at least 4.5:1, light and dark                                                                                                   | "meets WCAG AA…"                                                                                        |
| A5  | The receipt never exposes the private notify address                                                                                                 | Code: `replyTo` is now `REPLY_TO_EMAIL` or unset (no unit test: `sendContactEmails` reads the database) |
| A6  | Emails stay well under Gmail's 102 KB clip, even with long input                                                                                     | "stays far below…" (< 60 KB)                                                                            |
| A7  | A dark photo stays visible on dark backgrounds                                                                                                       | 1px ring with a dark-mode color, confirmed in renders                                                   |

## Implementation

- `email-design.ts`: `EmailProfile.photoUrl`; `avatar()` (photo in a ringed
  circle, or the mark); signature at 52px; `cardEmail({ header: "photo" })`.
  Eyebrows use `e-link`/`e-danger` classes with AA dark colors. A `DARK`
  palette is shared by the head styles and the tests. Separators use the muted
  color and are `aria-hidden`.
- `contact-email.ts`: `emailPhotoUrl()` (square check 0.9–1.1, R2-only,
  resizer URL); `profileFrom(…, photo)`; `emailProfile(sender)` loads Settings
  and the photo. The receipt uses the photo header and the new `Reply-To`.
- `documents.ts`: `SiteDocument` exposes the image `width`/`height`
  (additive).
- `contact.ts`: replies sign with `emailProfile(from)`, which includes the
  photo.

## Verification (run 2026-11-20 on this branch)

- `npm test`: 345 pass, 0 fail. `scripts/test-email-design.ts`: 13 pass.
- `npm run typecheck`, `npx eslint .` and `npm run format:check` are clean.
  `npm run build` and `npm run check:edge` succeed.
- Renders of the receipt, alert, reply and error alert in light, dark, phone
  and Gmail (head styles stripped), with a test headshot, all inspected.
- **Not verified:** real Outlook for Windows or the Gmail apps, and the photo
  in production (no profile photo is uploaded yet).

## Release

Not deployed. NOT RELEASE READY until merged and these owner actions are done:

1. Merge, then `npm run deploy:edge` (serves `/email/mark.png`).
2. Upload a square headshot in Admin → Settings → Profile photo. Until then
   the brand mark shows. This also replaces the full-body portrait as the
   author photo on articles.
3. Send a test contact message and a reply. Check the photo, name and dark
   mode in Gmail and Apple Mail.

Rollback: revert the merge commit. There are no schema or data changes.
