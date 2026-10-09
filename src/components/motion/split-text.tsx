/**
 * Word-by-word masked reveal for display headlines. Pure CSS (.split-word),
 * so it works in Server Components. Spaces stay real text nodes, so screen
 * readers and copy/paste get the sentence unchanged.
 */
export function SplitText({
  text,
  baseDelay = 0,
  startIndex = 0,
}: {
  text: string;
  baseDelay?: number;
  startIndex?: number;
}) {
  const words = text.split(/(\s+)/);
  let i = startIndex;
  return (
    <>
      {words.map((word, idx) =>
        /^\s+$/.test(word) ? (
          word
        ) : word.length === 0 ? null : (
          <span
            key={idx}
            className="split-word"
            style={
              {
                "--i": i++,
                "--base-delay": `${baseDelay}ms`,
              } as React.CSSProperties
            }
          >
            <span>{word}</span>
          </span>
        ),
      )}
    </>
  );
}
