// The home headline is plain text with one bit of markup: words wrapped in
// *asterisks* are accented (italic serif, purple). Headlines written before
// that existed have no asterisks, so they keep the original design: the
// word "intelligent" is accented wherever it appears as a whole word.

export interface HeadlineSegment {
  text: string;
  accent: boolean;
}

const DEFAULT_ACCENT = /\bintelligent\b/i;

export function parseHeadline(text: string): HeadlineSegment[] {
  const segments: HeadlineSegment[] = [];
  const push = (part: string, accent: boolean) => {
    if (part.length > 0) segments.push({ text: part, accent });
  };

  if (/\*[^*\s][^*]*\*/.test(text)) {
    // Split keeps the *…* groups at odd indexes.
    text.split(/\*([^*]+)\*/).forEach((part, i) => push(part, i % 2 === 1));
    return segments;
  }

  const match = DEFAULT_ACCENT.exec(text);
  if (!match) return [{ text, accent: false }];
  push(text.slice(0, match.index), false);
  push(match[0], true);
  push(text.slice(match.index + match[0].length), false);
  return segments;
}

/** The headline as plain text, without accent markers (for llms.txt etc). */
export function plainHeadline(text: string): string {
  return parseHeadline(text)
    .map((s) => s.text)
    .join("");
}
