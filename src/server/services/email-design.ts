import "server-only";

import { escapeHtml } from "./email";

/**
 * The email design system. Every email the site sends is built from these
 * pieces so they read as one family and match the website: Inter Tight for
 * headings and UI, Newsreader for reading text, the violet from the logo.
 *
 * Mail clients are not browsers, so the markup is deliberately old-fashioned:
 * tables for layout, inline styles for everything that must survive Gmail,
 * and a <style> block only for enhancements (dark mode, phone sizes, web
 * fonts) that clients without it simply skip. See docs/email-design-rpi.md.
 */

export const TOKENS = {
  violet: "#652bfc",
  ink: "#141416",
  body: "#2b2b30",
  muted: "#6b6a70",
  rule: "#e6e4de",
  canvas: "#f6f5f1",
  card: "#ffffff",
  quote: "#f8f7f4",
  danger: "#b42318",
} as const;

/** Dark-mode palette (applied by the head styles in clients that support it). */
export const DARK = {
  canvas: "#0a0a0b",
  card: "#121214",
  quote: "#19191c",
  text: "#f2f1ed",
  body: "#d9d8d3",
  muted: "#8c8b92",
  link: "#a48bff",
  danger: "#ff8a7a",
} as const;

const SANS = "'Inter Tight','Helvetica Neue',Helvetica,Arial,sans-serif";
const SERIF = "Newsreader,Georgia,'Times New Roman',serif";
const MONO = "'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace";

/** Who an email is from: drives the header, signature and footer. */
export interface EmailProfile {
  /** Display name in normal case, e.g. "Chibueze Maxwell". */
  name: string;
  /** One line under the name, e.g. "AI Engineer, entrepreneur, researcher, and writer". */
  role: string | null;
  siteUrl: string;
  /** Social profiles that are set, in display order. */
  links: { label: string; url: string }[];
  /** Small square photo of the person (already resized), or null for the brand mark. */
  photoUrl: string | null;
}

const bare = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/** The brand mark (a dark rounded tile, so it holds up on light and dark backgrounds). */
export function markUrl(siteUrl: string) {
  return `${siteUrl.replace(/\/$/, "")}/email/mark.png`;
}

function mark(profile: Pick<EmailProfile, "siteUrl">, size: number) {
  // Decorative: the name always sits next to it as text.
  return `<img src="${escapeHtml(markUrl(profile.siteUrl))}" width="${size}" height="${size}" alt="" style="display:block;border:0;outline:none;width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.22)}px;">`;
}

/**
 * The person's photo in a circle when there is one, else the brand mark.
 * Outlook for Windows ignores the radius and shows it square, which is fine.
 */
function avatar(profile: EmailProfile, size: number) {
  if (!profile.photoUrl) return mark(profile, size);
  // The ring keeps a dark photo's edge visible on a dark background.
  return `<img class="e-ring" src="${escapeHtml(profile.photoUrl)}" width="${size}" height="${size}" alt="" style="display:block;outline:none;width:${size}px;height:${size}px;border:1px solid ${TOKENS.rule};border-radius:50%;object-fit:cover;">`;
}

// ---------------------------------------------------------------------------
// Content blocks
// ---------------------------------------------------------------------------

export const eyebrow = (label: string, tone: "brand" | "danger" = "brand") =>
  `<p class="${tone === "danger" ? "e-danger" : "e-link"}" style="margin:0 0 14px;font-family:${MONO};font-size:11px;line-height:1.4;letter-spacing:.14em;text-transform:uppercase;color:${tone === "danger" ? TOKENS.danger : TOKENS.violet};">${escapeHtml(label)}</p>`;

export const heading = (html: string, options: { mono?: boolean } = {}) =>
  `<h1 class="e-text" style="margin:0 0 20px;font-family:${options.mono ? MONO : SANS};font-size:${options.mono ? 19 : 30}px;line-height:${options.mono ? 1.45 : 1.15};font-weight:600;letter-spacing:${options.mono ? 0 : "-0.02em"};color:${TOKENS.ink};mso-line-height-rule:exactly;">${html}</h1>`;

export const paragraph = (html: string, options: { last?: boolean } = {}) =>
  `<p class="e-body" style="margin:0 0 ${options.last ? 0 : 16}px;font-family:${SERIF};font-size:18px;line-height:1.65;color:${TOKENS.body};mso-line-height-rule:exactly;">${html}</p>`;

/** Free text written by a person (a reply or a message), whitespace kept. */
export const prose = (text: string) =>
  `<div class="e-body" style="font-family:${SERIF};font-size:18px;line-height:1.7;color:${TOKENS.body};white-space:pre-wrap;mso-line-height-rule:exactly;">${escapeHtml(text)}</div>`;

/** Someone else's words: a quiet panel with a violet edge. */
export const quote = (text: string, options: { muted?: boolean } = {}) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
<td class="e-quote ${options.muted ? "e-muted" : "e-body"}" style="background:${TOKENS.quote};border-left:3px solid ${options.muted ? TOKENS.rule : TOKENS.violet};border-radius:0 12px 12px 0;padding:18px 22px;font-family:${SERIF};font-size:${options.muted ? 15 : 17}px;line-height:1.65;color:${options.muted ? TOKENS.muted : TOKENS.body};white-space:pre-wrap;mso-line-height-rule:exactly;">${escapeHtml(text)}</td>
</tr></table>`;

/** Label/value rows, e.g. who a message is from. */
export const details = (rows: [string, string][]) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${rows
    .map(
      ([k, v]) =>
        `<tr><td class="e-muted" style="padding:5px 24px 5px 0;vertical-align:top;white-space:nowrap;font-family:${MONO};font-size:11px;line-height:1.6;letter-spacing:.08em;text-transform:uppercase;color:${TOKENS.muted};">${escapeHtml(k)}</td><td class="e-text" style="padding:4px 0;font-family:${SANS};font-size:15px;line-height:1.5;color:${TOKENS.ink};">${escapeHtml(v)}</td></tr>`,
    )
    .join("")}</table>`;

export const code = (text: string) =>
  `<pre class="e-quote e-body" style="margin:0 0 24px;padding:16px 18px;background:${TOKENS.quote};border-radius:12px;font-family:${MONO};font-size:12px;line-height:1.6;color:${TOKENS.body};white-space:pre-wrap;word-break:break-word;">${escapeHtml(text)}</pre>`;

/** A button that renders in every client, Outlook included (no images, no VML). */
export function button(
  label: string,
  href: string,
  secondary?: { label: string; href: string },
) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;"><tr>
<td bgcolor="${TOKENS.violet}" style="background:${TOKENS.violet};border-radius:999px;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 26px;font-family:${SANS};font-size:15px;line-height:1;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a></td>
${secondary ? `<td style="padding-left:20px;"><a class="e-text" href="${escapeHtml(secondary.href)}" style="font-family:${SANS};font-size:15px;color:${TOKENS.ink};text-decoration:none;">${escapeHtml(secondary.label)} &rarr;</a></td>` : ""}
</tr></table>`;
}

/** An inline link in body text. */
export const link = (label: string, href: string) =>
  `<a class="e-link" href="${escapeHtml(href)}" style="color:${TOKENS.violet};text-decoration:none;">${escapeHtml(label)}</a>`;

export const small = (html: string) =>
  `<p class="e-muted" style="margin:24px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${TOKENS.muted};">${html}</p>`;

/** Name, role and links with the mark: closes every personal email. */
export function signature(profile: EmailProfile) {
  const links = [{ label: bare(profile.siteUrl), url: profile.siteUrl }, ...profile.links]
    .map(
      (l) =>
        `<a class="e-link" href="${escapeHtml(l.url)}" style="color:${TOKENS.violet};text-decoration:none;">${escapeHtml(l.label)}</a>`,
    )
    .join(
      `<span class="e-muted" aria-hidden="true" style="color:${TOKENS.muted};">&nbsp;&nbsp;/&nbsp;&nbsp;</span>`,
    );
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:36px 0 0;"><tr><td class="e-rule" style="border-top:1px solid ${TOKENS.rule};padding-top:24px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:top;padding-right:16px;">${avatar(profile, 52)}</td>
<td style="vertical-align:top;">
<p class="e-text" style="margin:0;font-family:${SANS};font-size:16px;line-height:1.35;font-weight:600;letter-spacing:-0.01em;color:${TOKENS.ink};">${escapeHtml(profile.name)}</p>
${profile.role ? `<p class="e-muted" style="margin:3px 0 0;font-family:${SANS};font-size:13px;line-height:1.5;color:${TOKENS.muted};">${escapeHtml(profile.role)}</p>` : ""}
<p style="margin:8px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;">${links}</p>
</td></tr></table>
</td></tr></table>`;
}

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

/**
 * Head styles. Everything here is an enhancement: Gmail drops the dark-mode
 * and web-font parts and the email still looks right from inline styles.
 */
function head(title: string) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(title)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<!--[if !mso]><!--><link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;600&family=Newsreader:opsz,wght@6..72,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet"><!--<![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
img{-ms-interpolation-mode:bicubic;}
a{text-decoration:none;}
@media (max-width:620px){
  .e-pad{padding-left:24px!important;padding-right:24px!important;}
  .e-card{padding:32px 24px!important;border-radius:16px!important;}
  .e-letter{padding:28px 20px!important;}
  h1{font-size:26px!important;}
  .e-hide-sm{display:none!important;}
}
@media (prefers-color-scheme:dark){
  .e-canvas,body{background:${DARK.canvas}!important;}
  .e-card{background:${DARK.card}!important;border-color:#26262b!important;}
  .e-text,h1{color:${DARK.text}!important;}
  .e-body{color:${DARK.body}!important;}
  .e-muted{color:${DARK.muted}!important;}
  .e-quote{background:${DARK.quote}!important;}
  .e-rule{border-color:#26262b!important;}
  .e-ring{border-color:#3a3a41!important;}
  .e-link{color:${DARK.link}!important;}
  .e-danger{color:${DARK.danger}!important;}
}
[data-ogsc] .e-text,[data-ogsc] h1{color:${DARK.text}!important;}
[data-ogsc] .e-body{color:${DARK.body}!important;}
[data-ogsc] .e-muted{color:${DARK.muted}!important;}
[data-ogsc] .e-link{color:${DARK.link}!important;}
[data-ogsc] .e-danger{color:${DARK.danger}!important;}
</style>`;
}

/** Inbox preview text, padded so body copy doesn't leak in after it. */
function preheader(text?: string) {
  if (!text) return "";
  const pad = "&#847;&zwnj;&nbsp;".repeat(60);
  return `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:transparent;">${escapeHtml(text.replace(/\s+/g, " ").trim().slice(0, 140))}${pad}</div>`;
}

/** A centered 600px column that Outlook (which ignores max-width) also respects. */
function column(inner: string) {
  return `<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;border-collapse:separate;">${inner}</table>
<!--[if mso]></td></tr></table><![endif]-->`;
}

interface FrameOptions {
  title: string;
  preheader?: string;
}

/**
 * Branded frame for notices (receipts, alerts): mark and name on the canvas,
 * the content on a card, links and the reason for the email underneath.
 */
export function cardEmail(
  profile: EmailProfile,
  content: string,
  options: FrameOptions & {
    /** Small label at the top right, e.g. "Message received". */
    label?: string;
    /** Why the recipient got this email. */
    footnote?: string;
    /** Extra links in the footer, e.g. sections of the site. */
    footerLinks?: { label: string; url: string }[];
    /** "photo" puts the person's photo by the name at the top (emails to visitors). */
    header?: "mark" | "photo";
  },
) {
  const year = new Date().getUTCFullYear();
  const footerLinks = (options.footerLinks ?? [])
    .map(
      (l) =>
        `<a class="e-text" href="${escapeHtml(l.url)}" style="font-family:${SANS};font-size:13px;color:${TOKENS.ink};text-decoration:none;">${escapeHtml(l.label)}</a>`,
    )
    .join(
      `<span class="e-muted" style="color:${TOKENS.muted};">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>`,
    );
  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>${head(options.title)}</head>
<body class="e-canvas" style="margin:0;padding:0;background:${TOKENS.canvas};">
${preheader(options.preheader)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="e-canvas" bgcolor="${TOKENS.canvas}" style="background:${TOKENS.canvas};"><tr><td align="center" style="padding:40px 12px 48px;">
${column(`
<tr><td class="e-pad" style="padding:0 8px 22px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;"><a href="${escapeHtml(profile.siteUrl)}" style="text-decoration:none;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:12px;">${options.header === "photo" ? avatar(profile, 36) : mark(profile, 32)}</td>
<td class="e-text" style="vertical-align:middle;font-family:${SANS};font-size:16px;font-weight:600;letter-spacing:-0.01em;color:${TOKENS.ink};">${escapeHtml(profile.name)}</td>
</tr></table></a></td>
${options.label ? `<td align="right" class="e-muted e-hide-sm" style="vertical-align:middle;font-family:${MONO};font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${TOKENS.muted};">${escapeHtml(options.label)}</td>` : ""}
</tr></table>
</td></tr>
<tr><td class="e-card" bgcolor="${TOKENS.card}" style="background:${TOKENS.card};border:1px solid ${TOKENS.rule};border-radius:20px;padding:44px 44px 40px;">
${content}
</td></tr>
<tr><td class="e-pad" align="center" style="padding:28px 8px 0;font-family:${SANS};font-size:12px;line-height:1.7;color:${TOKENS.muted};">
${footerLinks ? `<p style="margin:0 0 10px;">${footerLinks}</p>` : ""}
${options.footnote ? `<p class="e-muted" style="margin:0 0 6px;color:${TOKENS.muted};">${escapeHtml(options.footnote)}</p>` : ""}
<p class="e-muted" style="margin:0;color:${TOKENS.muted};">&copy; ${year} ${escapeHtml(profile.name)} &middot; <a class="e-muted" href="${escapeHtml(profile.siteUrl)}" style="color:${TOKENS.muted};text-decoration:none;">${escapeHtml(bare(profile.siteUrl))}</a></p>
</td></tr>`)}
</td></tr></table>
</body></html>`;
}

/**
 * Personal correspondence (replies): reads like a letter, not a newsletter.
 * No card or banner; the brand lives in the signature.
 */
export function letterEmail(
  profile: EmailProfile,
  content: string,
  options: FrameOptions,
) {
  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>${head(options.title)}</head>
<body class="e-canvas" style="margin:0;padding:0;background:#ffffff;">
${preheader(options.preheader)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="e-canvas" bgcolor="#ffffff" style="background:#ffffff;"><tr><td align="center" class="e-letter" style="padding:36px 24px 48px;">
${column(`<tr><td style="text-align:left;">${content}</td></tr>`)}
</td></tr></table>
</body></html>`;
}
