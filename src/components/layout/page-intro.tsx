/** Shared header for public index pages: eyebrow marker, display title, lede. */
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-border mb-16 border-b pb-14 md:mb-20 md:pb-20">
      <p className="animate-rise index-label">
        <span>—</span>
        <span>{eyebrow}</span>
      </p>
      <h1
        className="animate-rise text-text mt-6 max-w-4xl font-sans text-[clamp(2.5rem,5.5vw,4.75rem)] leading-[0.98] font-semibold tracking-[-0.03em] text-balance"
        style={{ animationDelay: "100ms" }}
      >
        {title}
      </h1>
      {children ? (
        <div
          className="animate-rise text-text-muted mt-8 max-w-2xl font-serif text-lg leading-relaxed md:text-xl"
          style={{ animationDelay: "200ms" }}
        >
          {children}
        </div>
      ) : null}
    </header>
  );
}
