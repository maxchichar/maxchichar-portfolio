export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-border mb-10 flex flex-wrap items-end justify-between gap-4 border-b pb-6">
      <div>
        <h1 className="text-text font-sans text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-text-muted mt-2 max-w-xl font-serif text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </header>
  );
}
