import { SplitText } from "@/components/motion/split-text";

/** Shared header for public index pages: eyebrow marker, display title, lede. */
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-border mb-16 border-b pb-14 md:mb-20 md:pb-20">
      <p className="animate-rise index-label">
        <span>—</span>
        <span>{eyebrow}</span>
      </p>
      <h1 className="text-h1 text-text mt-6 max-w-4xl font-sans font-semibold text-balance">
        <SplitText text={title} baseDelay={80} />
      </h1>
      {children ? (
        <div
          className="animate-rise text-lede text-text-muted mt-8 max-w-2xl font-serif"
          style={{ animationDelay: "400ms" }}
        >
          {children}
        </div>
      ) : null}
    </header>
  );
}
