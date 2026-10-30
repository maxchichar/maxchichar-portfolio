import { parseEmailText, type Block, type Inline } from "@/lib/email-text";

const AVATAR_TONES = [
  "bg-accent/12 text-accent",
  "bg-accent-purple/12 text-accent-purple",
  "bg-text/[0.07] text-text",
];

/** Two initials ("Entrepreneur Media India via LinkedIn" → "EM"). */
function initials(name: string) {
  const words = name
    .replace(/\s+via\s+.*$/i, "")
    .split(/[\s@._-]+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w));
  return ((words[0]?.[0] ?? "?") + (words[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-sans font-semibold tracking-wide ${
        AVATAR_TONES[hash % AVATAR_TONES.length]
      } ${size === "sm" ? "h-9 w-9 text-[11px]" : "h-11 w-11 text-sm"}`}
    >
      {initials(name)}
    </span>
  );
}

const linkProps = {
  target: "_blank",
  rel: "noopener noreferrer nofollow",
  referrerPolicy: "no-referrer",
} as const;

function Inlines({ parts }: { parts: Inline[] }) {
  return parts.map((part, i) =>
    part.kind === "text" ? (
      part.text
    ) : (
      <a
        key={i}
        href={part.href}
        title={part.href.startsWith("mailto:") ? undefined : part.href}
        className="text-accent decoration-accent/30 hover:decoration-accent [overflow-wrap:anywhere] underline underline-offset-[3px] transition-colors"
        {...linkProps}
      >
        {part.label}
      </a>
    ),
  );
}

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      <path d="M7 13l6-6M8 7h5v5" />
    </svg>
  );
}

function Blocks({ blocks, small = false }: { blocks: Block[]; small?: boolean }) {
  return blocks.map((block, i) => {
    switch (block.kind) {
      case "paragraph":
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <span key={j}>
                {j > 0 ? <br /> : null}
                <Inlines parts={line} />
              </span>
            ))}
          </p>
        );
      case "list":
        return (
          <ul key={i} className="marker:text-text-muted list-disc space-y-1.5 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>
                <Inlines parts={item} />
              </li>
            ))}
          </ul>
        );
      case "divider":
        return <hr key={i} className="border-border" />;
      case "cta":
        if (small) {
          return (
            <p key={i}>
              <a
                href={block.href}
                title={block.href}
                className="hover:text-text underline underline-offset-[3px]"
                {...linkProps}
              >
                {block.label ?? `${block.host}${block.path}`}
              </a>
            </p>
          );
        }
        return block.label ? (
          <p key={i}>
            <a
              href={block.href}
              title={block.href}
              className="bg-text text-bg hover:bg-accent inline-flex max-w-full items-center gap-2 rounded-full px-5 py-2.5 font-sans text-sm font-medium no-underline transition-colors"
              {...linkProps}
            >
              <span className="truncate">{block.label}</span>
              <Arrow />
            </a>
            <span className="text-text-muted mt-1.5 block font-mono text-[11px]">
              {block.host}
            </span>
          </p>
        ) : (
          <a
            key={i}
            href={block.href}
            title={block.href}
            className="rounded-card border-border bg-bg hover:border-text/30 group flex items-center gap-3 border px-4 py-3 no-underline transition-colors"
            {...linkProps}
          >
            <span className="bg-surface border-border text-text-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] uppercase">
              {block.host.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-text block truncate font-sans text-sm font-medium">
                {block.host}
              </span>
              {block.path ? (
                <span className="text-text-muted block truncate font-mono text-[11px]">
                  {block.path}
                </span>
              ) : null}
            </span>
            <span className="text-text-muted group-hover:text-accent transition-colors">
              <Arrow />
            </span>
          </a>
        );
    }
  });
}

/**
 * A message body, read like an email: clean paragraphs, links as buttons
 * and cards, the quoted thread folded away and newsletter fine print set
 * apart. Form messages keep the serif reading voice; email reads in sans.
 */
export function EmailBody({ text, source }: { text: string; source: string }) {
  const { body, footer, quoted } = parseEmailText(text);
  return (
    <div className="[overflow-wrap:anywhere]">
      <div
        className={`text-text space-y-4 ${
          source === "email"
            ? "font-sans text-[15px] leading-7"
            : "font-serif text-base leading-relaxed sm:text-lg"
        }`}
      >
        <Blocks blocks={body} />
      </div>

      {quoted ? (
        <details className="group mt-6">
          <summary className="border-border text-text-muted hover:text-text hover:border-text/30 inline-flex cursor-pointer list-none items-center gap-2 rounded-full border px-3 py-1 font-sans text-xs transition-colors [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="tracking-widest">
              •••
            </span>
            <span className="group-open:hidden">Show earlier messages</span>
            <span className="hidden group-open:inline">Hide earlier messages</span>
          </summary>
          <blockquote className="border-border text-text-muted mt-4 border-l-2 pl-4 font-sans text-sm leading-6 whitespace-pre-wrap">
            {quoted}
          </blockquote>
        </details>
      ) : null}

      {footer.length ? (
        <footer className="border-border text-text-muted mt-10 space-y-2 border-t pt-5 font-sans text-xs leading-5">
          <Blocks blocks={footer} small />
        </footer>
      ) : null}
    </div>
  );
}
