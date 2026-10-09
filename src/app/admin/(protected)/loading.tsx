export default function AdminLoading() {
  return (
    <div
      aria-busy="true"
      className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-12"
    >
      <span className="sr-only">Loading…</span>
      <div className="skeleton h-9 w-56" />
      <div className="skeleton mt-3 h-4 w-80" />
      <div className="border-border mt-6 border-t" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton rounded-panel h-40" />
        ))}
      </div>
      <div className="skeleton rounded-panel mt-4 h-64" />
    </div>
  );
}
