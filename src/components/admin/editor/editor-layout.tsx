import Link from "next/link";

/** Two-column editor frame: fields on the left, publishing panel on the right. */
export function EditorLayout({
  backHref,
  backLabel,
  title,
  subtitle,
  aside,
  children,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
  aside: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
      <Link
        href={backHref}
        className="text-text-muted hover:text-text -my-1 inline-flex items-center gap-1.5 py-1 font-sans text-sm transition-colors sm:text-xs"
      >
        ← {backLabel}
      </Link>
      <header className="border-border mt-4 mb-6 border-b pb-5 sm:mb-8 sm:pb-6">
        <h1 className="text-text font-sans text-2xl font-semibold tracking-tight text-balance [overflow-wrap:anywhere] sm:text-3xl">
          {title}
        </h1>
        <p className="text-text-muted mt-1.5 font-mono text-xs [overflow-wrap:anywhere]">
          {subtitle}
        </p>
      </header>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="order-2 min-w-0 space-y-6 lg:order-1">{children}</div>
        <aside className="order-1 min-w-0 lg:order-2">{aside}</aside>
      </div>
    </main>
  );
}
