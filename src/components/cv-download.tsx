import { formatFileSize } from "@/lib/file-size";

export interface CvInfo {
  sizeBytes: number;
  updatedAt: Date;
}

/**
 * "Download CV" for public pages: a real download (proper filename, works the
 * same in every browser) plus a "View" link that opens the PDF in a new tab.
 * Renders nothing until a CV has been added in Settings.
 */
export function CvDownload({
  cv,
  className = "",
}: {
  cv: CvInfo | null;
  className?: string;
}) {
  if (!cv) return null;
  const updated = cv.updatedAt.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-3 ${className}`}>
      <a
        href="/cv?download=1"
        download
        className="group border-text text-text hover:bg-text hover:text-bg inline-flex items-center gap-2 rounded-full border px-5 py-2.5 font-sans text-sm font-medium transition-colors"
      >
        Download CV
        <span
          aria-hidden="true"
          className="transition-transform group-hover:translate-y-0.5"
        >
          ↓
        </span>
      </a>
      <span className="text-text-muted font-mono text-[11px] tracking-[0.14em] uppercase">
        PDF · {formatFileSize(cv.sizeBytes)} · Updated {updated}
        <span aria-hidden="true"> · </span>
        <a
          href="/cv"
          target="_blank"
          rel="noopener"
          // Padding grows the tap target without changing the line.
          className="hover:text-text -my-3 inline-block py-3 underline-offset-4 transition-colors hover:underline"
        >
          View
          <span className="sr-only"> CV (opens in a new tab)</span>
        </a>
      </span>
    </div>
  );
}
