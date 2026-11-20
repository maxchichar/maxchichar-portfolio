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
