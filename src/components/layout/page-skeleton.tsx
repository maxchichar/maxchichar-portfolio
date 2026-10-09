/**
 * Loading placeholders shaped like the real pages, so content settles into
 * place instead of popping in. Includes a nav-height bar because each page
 * renders its own <Nav>.
 */
export function PageSkeleton({ variant }: { variant: "index" | "detail" }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="border-border h-16 border-b md:h-20" />
      <div className="container-site pt-16 md:pt-24">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton mt-6 h-14 w-full max-w-3xl md:h-20" />
        <div className="skeleton mt-3 h-14 w-2/3 max-w-2xl md:h-20" />
        <div className="skeleton mt-8 h-5 w-full max-w-xl" />
        <div className="skeleton mt-2 h-5 w-1/2 max-w-md" />
        {variant === "index" ? (
          <div className="mt-20 grid gap-6 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div className="skeleton rounded-panel aspect-[16/10] w-full" />
                <div className="skeleton mt-5 h-5 w-2/3" />
                <div className="skeleton mt-3 h-4 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="skeleton rounded-panel mt-16 aspect-[21/9] w-full" />
            <div className="mx-auto mt-16 max-w-[68ch] space-y-3">
              {[100, 96, 100, 88, 100, 72].map((w, i) => (
                <div key={i} className="skeleton h-4" style={{ width: `${w}%` }} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
