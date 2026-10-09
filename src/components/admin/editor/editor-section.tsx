/** A titled card grouping related fields in an admin editor. */
export function EditorSection({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="rounded-panel border-border bg-surface scroll-mt-24 border"
    >
      <header className="border-border border-b px-6 py-4">
        <h2 className="text-text font-sans text-sm font-semibold">{title}</h2>
        {description ? (
          <p className="text-text-muted mt-0.5 font-sans text-xs">{description}</p>
        ) : null}
      </header>
      <div className="space-y-5 p-6">{children}</div>
    </section>
  );
}
