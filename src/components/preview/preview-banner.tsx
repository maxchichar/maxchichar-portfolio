import Link from "next/link";

/**
 * Floating bar on draft previews: what you're looking at, and the way back
 * to the editor. Bottom-centred so it never covers the nav.
 */
export function PreviewBanner({
  isDraft,
  version,
  editHref,
  liveHref,
}: {
  isDraft: boolean;
  version: number;
  editHref: string;
  liveHref: string | null;
}) {
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-[80] flex justify-center sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
    >
      <div className="bg-text text-bg flex w-full max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-2xl px-5 py-3 font-sans text-sm shadow-2xl shadow-black/30 sm:w-auto sm:rounded-full">
        <span className="flex items-center gap-2 font-medium">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${isDraft ? "bg-accent-purple" : "bg-accent"}`}
          />
          {isDraft ? `Draft preview · v${version}` : `Live version · v${version}`}
        </span>
        <span className="opacity-70">
          {isDraft
            ? liveHref
              ? "Visitors still see the published version."
              : "Not published yet. Only you can see this."
            : "There's no draft; this is what visitors see."}
        </span>
        <span className="flex items-center gap-4">
          <Link href={editHref} className="underline underline-offset-4 hover:opacity-80">
            Back to editor
          </Link>
          {isDraft && liveHref ? (
            <a
              href={liveHref}
              target="_blank"
              rel="noopener"
              className="underline underline-offset-4 hover:opacity-80"
            >
              View live ↗
            </a>
          ) : null}
        </span>
      </div>
    </div>
  );
}
