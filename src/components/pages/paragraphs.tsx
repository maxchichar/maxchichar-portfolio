// Page fields are plain strings written in textareas; blank lines separate
// paragraphs — the same treatment case-study-view, research-detail-view,
// and article-detail-view already give stored text.
export function Paragraphs({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .trim()
    .split(/\n{2,}/)
    .filter((p) => p.trim().length > 0);

  return (
    <div className={className ?? "space-y-4"}>
      {paragraphs.map((p, idx) => (
        <p key={idx}>{p}</p>
      ))}
    </div>
  );
}
