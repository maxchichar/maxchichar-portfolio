// Page fields are plain strings written in textareas; blank lines separate
// paragraphs — the same treatment case-study-view, research-detail-view,
// and article-detail-view already give stored text. Lines starting with
// "- ", "* " or "• " form a bulleted list, so fields like capabilities can be
// written as a list instead of one long comma-separated sentence.

type Block = { kind: "p"; lines: string[] } | { kind: "ul"; items: string[] };

const BULLET = /^\s*[-*•]\s+/;

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const raw of text.trim().split("\n")) {
    const line = raw.trim();
    if (line.length === 0) {
      current = null;
      continue;
    }
    if (BULLET.test(line)) {
      const item = line.replace(BULLET, "");
      if (current?.kind !== "ul") {
        current = { kind: "ul", items: [] };
        blocks.push(current);
      }
      current.items.push(item);
    } else {
      if (current?.kind !== "p") {
        current = { kind: "p", lines: [] };
        blocks.push(current);
      }
      current.lines.push(line);
    }
  }
  return blocks;
}

export function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className ?? "space-y-4"}>
      {parseBlocks(text).map((block, idx) =>
        block.kind === "p" ? (
          // Single line breaks inside a paragraph read as spaces, as before.
          <p key={idx}>{block.lines.join(" ")}</p>
        ) : (
          <ul key={idx} className="space-y-2.5">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="bg-accent-purple mt-[0.8em] h-px w-4 shrink-0"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
