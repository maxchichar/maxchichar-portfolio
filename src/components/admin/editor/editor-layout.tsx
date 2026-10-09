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
    <main className="mx-auto w-full max-w-7xl px-6 py-8 md:px-10 md:py-10">
      <Link
        href={backHref}
        className="text-text-muted hover:text-text inline-flex items-center gap-1.5 font-sans text-xs transition-colors"
      >
        ← {backLabel}
      </Link>
      <header className="border-border mt-4 mb-8 border-b pb-6">
        <h1 className="text-text font-sans text-3xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        <p className="text-text-muted mt-1.5 font-mono text-xs">{subtitle}</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="order-2 min-w-0 space-y-6 lg:order-1">{children}</div>
        <aside className="order-1 lg:order-2">{aside}</aside>
      </div>
    </main>
  );
}
