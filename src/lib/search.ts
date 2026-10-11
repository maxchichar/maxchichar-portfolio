/**
 * Tiny dependency-free search for the command palette. The index is a few
 * dozen published items, so a linear scan with weighted matching is
 * instant and needs no search service. Pure functions (no DOM), so they
 * can be unit tested.
 */

export type SearchItemType = "work" | "research" | "writing";

export interface SearchItem {
  type: SearchItemType;
  title: string;
  summary: string;
  href: string;
  /** Short context shown on the right, e.g. category and year. */
  meta: string | null;
  tags: string[];
  /** Plain body text (truncated), so words inside the content match too. */
  body: string;
}

export interface SearchHit {
  item: SearchItem;
  score: number;
  /** Set when the match was only in the body: text around the first match. */
  snippet: string | null;
}

/** Lowercase and strip accents, so "resume" matches "résumé". */
export function normalize(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}

export function queryTerms(query: string): string[] {
  return normalize(query)
    .split(/[^\p{L}\p{N}+#.]+/u)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter(Boolean)
    .slice(0, 8);
}

function startsWord(haystack: string, term: string): boolean {
  let from = 0;
  for (;;) {
    const i = haystack.indexOf(term, from);
    if (i === -1) return false;
    if (i === 0 || !/[\p{L}\p{N}]/u.test(haystack[i - 1]!)) return true;
    from = i + 1;
  }
}

function snippetAround(body: string, term: string, radius = 70): string | null {
  const i = normalize(body).indexOf(term);
  if (i === -1) return null;
  const start = Math.max(0, i - radius);
  const end = Math.min(body.length, i + term.length + radius);
  const cutStart = start > 0 ? body.indexOf(" ", start) + 1 || start : 0;
  const cutEnd = end < body.length ? body.lastIndexOf(" ", end) : body.length;
  return `${cutStart > 0 ? "…" : ""}${body.slice(cutStart, Math.max(cutEnd, i + term.length)).trim()}${cutEnd < body.length ? "…" : ""}`;
}

/**
 * Every term must match somewhere (AND). Title hits weigh most, word-start
 * hits more than mid-word ones, then tags, summary, meta and body.
 */
export function search(items: SearchItem[], query: string, limit = 20): SearchHit[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  const whole = normalize(query.trim());

  const hits: SearchHit[] = [];
  for (const item of items) {
    const title = normalize(item.title);
    const summary = normalize(item.summary);
    const tags = normalize(item.tags.join(" "));
    const meta = normalize(item.meta ?? "");
    const body = normalize(item.body);

    let score = 0;
    let onlyBody: string | null = null;
    let matchedAll = true;
    for (const term of terms) {
      let s = 0;
      if (startsWord(title, term)) s = 10;
      else if (title.includes(term)) s = 6;
      else if (startsWord(tags, term)) s = 5;
      else if (summary.includes(term)) s = startsWord(summary, term) ? 4 : 3;
      else if (meta.includes(term)) s = 2;
      else if (body.includes(term)) {
        s = 1;
        onlyBody ??= term;
      }
      if (s === 0) {
        matchedAll = false;
        break;
      }
      score += s;
    }
    if (!matchedAll) continue;
    if (title.startsWith(whole)) score += 8;
    else if (title.includes(whole)) score += 4;

    const bodyOnly =
      onlyBody !== null && terms.every((t) => !title.includes(t) && !summary.includes(t));
    hits.push({
      item,
      score,
      snippet: bodyOnly ? snippetAround(item.body, onlyBody!) : null,
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Splits `text` into parts for highlighting: matched ranges (any term,
 * accent- and case-insensitive) are flagged so the UI can wrap them.
 */
export function highlight(
  text: string,
  query: string,
): { text: string; match: boolean }[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [{ text, match: false }];
  const norm = normalize(text);
  // NFKD can change length (e.g. "é" -> "e" + mark), so only highlight when
  // normalising kept indexes aligned; otherwise return the text unmarked.
  if (norm.length !== text.length) return [{ text, match: false }];

  const marks = new Array<boolean>(text.length).fill(false);
  for (const term of terms) {
    let from = 0;
    for (;;) {
      const i = norm.indexOf(term, from);
      if (i === -1) break;
      for (let k = i; k < i + term.length; k++) marks[k] = true;
      from = i + term.length;
    }
  }
  const parts: { text: string; match: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts.at(-1);
    if (last && last.match === marks[i]) last.text += text[i];
    else parts.push({ text: text[i]!, match: marks[i]! });
  }
  return parts;
}
