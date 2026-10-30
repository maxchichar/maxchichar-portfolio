/**
 * Turns the plain text of an inbox message into blocks the admin can render
 * as a readable email: paragraphs, labelled links ("Read on LinkedIn" + URL
 * become one button), lists, dividers, the quoted thread and the newsletter
 * fine print. Pure and string-only: links are only ever built from http(s)
 * URLs and email addresses matched here, never from markup in the message.
 */

export type Inline =
  { kind: "text"; text: string } | { kind: "link"; href: string; label: string };

export type Block =
  | { kind: "paragraph"; lines: Inline[][] }
  | { kind: "cta"; href: string; label: string | null; host: string; path: string }
  | { kind: "list"; items: Inline[][] }
  | { kind: "divider" };

export interface ParsedEmail {
  body: Block[];
  /** Unsubscribe links, legal lines and the like, shown small at the end. */
  footer: Block[];
  /** The earlier thread ("On … wrote:" and "> " lines), shown collapsed. */
  quoted: string | null;
}

const URL_RE = /\bhttps?:\/\/[^\s<>()[\]{}"']+[^\s<>()[\]{}"'.,;:!?]/gi;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const HAS_URL = /https?:\/\//i;
const BARE_URL = /^<?(https?:\/\/\S+?)>?$/i;
// "Label <https://…>", "Label (https://…)" and "Label: https://…".
const LABELLED_URL = [
  /^(.{1,80}?)\s*(?::|-|–|—)?\s*[<([]\s*(https?:\/\/\S+?)\s*[>)\]]$/i,
  /^([^:]{1,60}):\s+(https?:\/\/\S+)$/i,
];
const BULLET = /^(?:[-•*·▪◦]|\d{1,2}[.)])\s+/;
const DIVIDER = /^[-=_*~─━•·]{3,}$/;
// Where a reply's earlier thread begins. (A forwarded message is the
// content itself, so it isn't collapsed.)
const QUOTE_START = [/^On .{4,200}wrote:$/i, /^-{2,}\s*Original Message\s*-{2,}$/i];
const FOOTER = new RegExp(
  [
    "unsubscribe",
    "opt[ -]?out",
    "you (?:are |were )?receiv(?:ed|ing) this",
    "you're receiving",
    "this (?:e-?mail|message) was (?:sent|intended)",
    "manage (?:your )?(?:e-?mail |notification |subscription )?(?:preferences|settings|subscriptions|notifications)",
    "privacy policy",
    "©",
    "\\(c\\) ?\\d{4}",
    "all rights reserved",
  ].join("|"),
  "i",
);

/** Characters newsletters pad their preheaders with; invisible but they break layout. */
const INVISIBLE = new RegExp(
  `[${[
    [0xad],
    [0x34f],
    [0x61c],
    [0x115f, 0x1160],
    [0x17b4, 0x17b5],
    [0x180e],
    [0x200b, 0x200f],
    [0x2028, 0x202e],
    [0x2060, 0x206f],
    [0x3164],
    [0xfeff],
    [0xffa0],
  ]
    .map(([from, to]) =>
      to === undefined
        ? String.fromCharCode(from!)
        : `${String.fromCharCode(from!)}-${String.fromCharCode(to)}`,
    )
    .join("")}]`,
  "g",
);

function normalize(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(INVISIBLE, "")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+$/, "").replace(/^\s+/, ""));
}

/** `linkedin.com` and `/comm/pulse/top-stories…`, without www, query or hash. */
export function describeUrl(href: string): { host: string; path: string } {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname === "/" ? "" : decodeURI(url.pathname).replace(/\/$/, "");
    return { host, path: path.length > 36 ? `${path.slice(0, 35)}…` : path };
  } catch {
    return { host: href, path: "" };
  }
}

function shortUrl(href: string): string {
  const { host, path } = describeUrl(href);
  return `${host}${path}`;
}

/** Splits a line into text and links (URLs and email addresses). */
export function linkify(line: string): Inline[] {
  const matches: { index: number; text: string; href: string; label: string }[] = [];
  for (const m of line.matchAll(URL_RE)) {
    matches.push({ index: m.index, text: m[0], href: m[0], label: shortUrl(m[0]) });
  }
  for (const m of line.matchAll(EMAIL_RE)) {
    const inUrl = matches.some(
      (u) => m.index >= u.index && m.index < u.index + u.text.length,
    );
    if (!inUrl)
      matches.push({ index: m.index, text: m[0], href: `mailto:${m[0]}`, label: m[0] });
  }
  matches.sort((a, b) => a.index - b.index);

  const out: Inline[] = [];
  let at = 0;
  for (const m of matches) {
    if (m.index < at) continue;
    if (m.index > at) out.push({ kind: "text", text: line.slice(at, m.index) });
    out.push({ kind: "link", href: m.href, label: m.label });
    at = m.index + m.text.length;
  }
  if (at < line.length) out.push({ kind: "text", text: line.slice(at) });
  return out;
}

function cta(href: string, label: string | null): Block {
  return { kind: "cta", href, label, ...describeUrl(href) };
}

/** A short line that reads like a button label rather than a sentence. */
function isLabel(line: string): boolean {
  return (
    line.length > 0 && line.length <= 60 && !HAS_URL.test(line) && !/[.!?]$/.test(line)
  );
}

function paragraphBlocks(lines: string[]): Block[] {
  if (lines.every((l) => BULLET.test(l)) && lines.length > 1) {
    return [{ kind: "list", items: lines.map((l) => linkify(l.replace(BULLET, ""))) }];
  }
  const blocks: Block[] = [];
  let pending: string[] = [];
  const flush = () => {
    if (pending.length) blocks.push({ kind: "paragraph", lines: pending.map(linkify) });
    pending = [];
  };
  for (const line of lines) {
    if (DIVIDER.test(line)) {
      flush();
      blocks.push({ kind: "divider" });
      continue;
    }
    const bare = BARE_URL.exec(line);
    if (bare?.[1]) {
      const previous = pending.at(-1);
      const label = previous !== undefined && isLabel(previous) ? previous : null;
      if (label !== null) pending.pop();
      flush();
      blocks.push(cta(bare[1], label));
      continue;
    }
    const labelled = LABELLED_URL.map((re) => re.exec(line)).find(Boolean);
    if (labelled?.[1] && labelled[2]) {
      flush();
      blocks.push(cta(labelled[2], labelled[1].trim()));
      continue;
    }
    pending.push(line);
  }
  flush();
  return blocks;
}

export function parseEmailText(text: string): ParsedEmail {
  const lines = normalize(text);

  // The earlier thread: from the first "On … wrote:" / "> " run to the end.
  let quoted: string | null = null;
  const quoteAt = lines.findIndex(
    (line, i) =>
      lines.slice(0, i).some(Boolean) &&
      (QUOTE_START.some((re) => re.test(line)) ||
        (line.startsWith(">") && lines.slice(i).every((l) => !l || l.startsWith(">")))),
  );
  if (quoteAt > 0) {
    quoted = lines
      .slice(quoteAt)
      .map((l) => l.replace(/^>\s?/, ""))
      .join("\n")
      .trim();
    lines.splice(quoteAt);
  }

  // Paragraphs split on blank lines, with repeats (newsletters often print
  // the byline twice) dropped.
  const paragraphs: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line) current.push(line);
    else if (current.length) {
      paragraphs.push(current);
      current = [];
    }
  }
  if (current.length) paragraphs.push(current);
  const key = (p: string[]) => p.join(" ").toLowerCase();
  const unique = paragraphs.filter(
    (p, i) => i === 0 || key(p) !== key(paragraphs[i - 1]!),
  );

  // Everything from the first unsubscribe/legal paragraph on is fine print.
  const footerAt = unique.findIndex((p, i) => i > 0 && FOOTER.test(p.join(" ")));
  const main = footerAt > 0 ? unique.slice(0, footerAt) : unique;
  const fine = footerAt > 0 ? unique.slice(footerAt) : [];

  return {
    body: main.flatMap(paragraphBlocks),
    footer: fine.flatMap(paragraphBlocks),
    quoted: quoted || null,
  };
}
